import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { refreshAccessToken } from "./ga.server";
import { assertReportAccess } from "./windsor.server";

export type GscPreset = "last_7d" | "last_28d" | "last_30d" | "last_90d" | "last_y";

type GscRow = { keys?: string[]; clicks?: number; impressions?: number; ctr?: number; position?: number };

const iso = (d: Date) => d.toISOString().slice(0, 10);

export function gscRange(preset: GscPreset, dateFrom?: string, dateTo?: string) {
  if (dateFrom && dateTo) return { startDate: dateFrom, endDate: dateTo };
  // GSC data lags ~2-3 days; end at yesterday.
  const end = new Date();
  end.setDate(end.getDate() - 1);
  const days = preset === "last_7d" ? 7 : preset === "last_28d" ? 28 : preset === "last_30d" ? 30 : preset === "last_90d" ? 90 : 365;
  const start = new Date(end);
  start.setDate(start.getDate() - days + 1);
  return { startDate: iso(start), endDate: iso(end) };
}

function previousRange(startDate: string, endDate: string) {
  const s = new Date(startDate);
  const e = new Date(endDate);
  const span = Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
  const prevEnd = new Date(s);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - span + 1);
  return { startDate: iso(prevStart), endDate: iso(prevEnd) };
}

async function query(
  accessToken: string,
  siteUrl: string,
  body: Record<string, unknown>,
): Promise<GscRow[]> {
  const res = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) throw new Error(`GSC ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { rows?: GscRow[] };
  return json.rows ?? [];
}

function totalsOf(rows: GscRow[]) {
  const clicks = rows.reduce((a, r) => a + (r.clicks ?? 0), 0);
  const impressions = rows.reduce((a, r) => a + (r.impressions ?? 0), 0);
  // Impression-weighted average position is the correct aggregation.
  const weighted = rows.reduce((a, r) => a + (r.position ?? 0) * (r.impressions ?? 0), 0);
  return {
    clicks,
    impressions,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    position: impressions > 0 ? weighted / impressions : 0,
  };
}

function mapRows(rows: GscRow[], keyNames: string[]) {
  return rows.map((r) => {
    const out: Record<string, unknown> = {};
    keyNames.forEach((k, i) => {
      out[k] = r.keys?.[i] ?? "";
    });
    out.clicks = r.clicks ?? 0;
    out.impressions = r.impressions ?? 0;
    out.ctr = (r.ctr ?? 0) * 100;
    out.position = r.position ?? 0;
    return out;
  });
}

function delta(current: number, previous: number) {
  if (!previous) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

export async function getGscFullReportImpl(
  callerId: string,
  reportId: string,
  opts: { preset?: GscPreset; dateFrom?: string; dateTo?: string; rowLimit?: number } = {},
) {
  await assertReportAccess(callerId, reportId);

  const { data: conns, error } = await supabaseAdmin
    .from("gsc_connections")
    .select("id, type, site_url, google_email, refresh_token")
    .eq("report_id", reportId);
  if (error) throw new Error(error.message);

  const usable = (conns ?? []).filter((c) => c.site_url && c.refresh_token);
  if (usable.length === 0) {
    return {
      report_id: reportId,
      properties: [],
      note: "Nenhuma propriedade do Google Search Console está conectada a este relatório.",
    };
  }

  const { startDate, endDate } = gscRange(opts.preset ?? "last_28d", opts.dateFrom, opts.dateTo);
  const prev = previousRange(startDate, endDate);
  const rowLimit = Math.min(Math.max(opts.rowLimit ?? 250, 1), 1000);

  const properties = await Promise.all(
    usable.map(async (c) => {
      try {
        const { access_token } = await refreshAccessToken(c.refresh_token as string);
        const site = c.site_url as string;
        const base = { startDate, endDate, dataState: "all" as const };

        const [queries, pages, byDate, devices, countries, appearance, pageQuery, prevTotals] =
          await Promise.all([
            query(access_token, site, { ...base, dimensions: ["query"], rowLimit }),
            query(access_token, site, { ...base, dimensions: ["page"], rowLimit }),
            query(access_token, site, { ...base, dimensions: ["date"], rowLimit: 1000 }),
            query(access_token, site, { ...base, dimensions: ["device"], rowLimit: 10 }),
            query(access_token, site, { ...base, dimensions: ["country"], rowLimit: 50 }),
            query(access_token, site, { ...base, dimensions: ["searchAppearance"], rowLimit: 25 }).catch(() => []),
            query(access_token, site, { ...base, dimensions: ["page", "query"], rowLimit: Math.min(rowLimit, 500) }),
            query(access_token, site, { startDate: prev.startDate, endDate: prev.endDate, dimensions: ["date"], rowLimit: 1000 }),
          ]);

        const totals = totalsOf(byDate);
        const previous = totalsOf(prevTotals);

        return {
          connection_id: c.id,
          type: c.type,
          site_url: site,
          google_email: c.google_email,
          totals,
          previous_period: { range: prev, ...previous },
          comparison: {
            clicks_pct: delta(totals.clicks, previous.clicks),
            impressions_pct: delta(totals.impressions, previous.impressions),
            ctr_pct_points: totals.ctr - previous.ctr,
            position_change: previous.position - totals.position, // positivo = melhorou
          },
          daily: mapRows(byDate, ["date"]),
          queries: mapRows(queries, ["query"]),
          pages: mapRows(pages, ["page"]),
          devices: mapRows(devices, ["device"]),
          countries: mapRows(countries, ["country"]),
          search_appearance: mapRows(appearance, ["searchAppearance"]),
          page_query_pairs: mapRows(pageQuery, ["page", "query"]),
          opportunities: {
            striking_distance: mapRows(queries, ["query"])
              .filter((r) => (r.position as number) > 8 && (r.position as number) <= 20 && (r.impressions as number) > 0)
              .sort((a, b) => (b.impressions as number) - (a.impressions as number))
              .slice(0, 30),
            high_impressions_low_ctr: mapRows(queries, ["query"])
              .filter((r) => (r.impressions as number) >= 100 && (r.ctr as number) < 2)
              .sort((a, b) => (b.impressions as number) - (a.impressions as number))
              .slice(0, 30),
          },
        };
      } catch (e) {
        return {
          connection_id: c.id,
          type: c.type,
          site_url: c.site_url,
          error: (e as Error).message,
        };
      }
    }),
  );

  return {
    report_id: reportId,
    period: { startDate, endDate, previous: prev },
    properties,
  };
}

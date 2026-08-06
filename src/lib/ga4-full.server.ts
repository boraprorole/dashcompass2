import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { runReport } from "./ga.server";
import { assertReportAccess } from "./windsor.server";

export type GaPreset = "last_7d" | "last_28d" | "last_30d" | "last_90d" | "last_y";

const iso = (d: Date) => d.toISOString().slice(0, 10);

function resolveRange(preset: GaPreset, dateFrom?: string, dateTo?: string) {
  if (dateFrom && dateTo) return { startDate: dateFrom, endDate: dateTo };
  const end = new Date();
  const days =
    preset === "last_7d" ? 7 : preset === "last_28d" ? 28 : preset === "last_30d" ? 30 : preset === "last_90d" ? 90 : 365;
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

type Report = Awaited<ReturnType<typeof runReport>>;

function rowsToObjects(res: Report, dims: string[], mets: string[]) {
  return (res.rows ?? []).map((r) => {
    const out: Record<string, string | number> = {};
    dims.forEach((d, i) => {
      out[d] = r.dimensionValues?.[i]?.value ?? "";
    });
    mets.forEach((m, i) => {
      out[m] = Number(r.metricValues?.[i]?.value ?? 0);
    });
    return out;
  });
}

function totalsToObject(res: Report, mets: string[]) {
  const row = res.totals?.[0]?.metricValues ?? res.rows?.[0]?.metricValues ?? [];
  const out: Record<string, number> = {};
  mets.forEach((m, i) => {
    out[m] = Number(row[i]?.value ?? 0);
  });
  return out;
}

function delta(current: number, previous: number) {
  if (!previous) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

const CORE_METRICS = [
  "activeUsers",
  "newUsers",
  "totalUsers",
  "sessions",
  "engagedSessions",
  "screenPageViews",
  "engagementRate",
  "averageSessionDuration",
  "bounceRate",
  "eventCount",
  "conversions",
];

export async function getGa4FullReportImpl(
  callerId: string,
  reportId: string,
  opts: { preset?: GaPreset; dateFrom?: string; dateTo?: string; rowLimit?: number } = {},
) {
  await assertReportAccess(callerId, reportId);

  const { data: conns, error } = await supabaseAdmin
    .from("ga_connections")
    .select("id, ga_property_id, label, google_email, refresh_token")
    .eq("report_id", reportId);
  if (error) throw new Error(error.message);

  const usable = (conns ?? []).filter((c) => c.ga_property_id && c.refresh_token);
  if (usable.length === 0) {
    return {
      report_id: reportId,
      properties: [],
      note: "Nenhuma propriedade do Google Analytics 4 está conectada a este relatório.",
    };
  }

  const { startDate, endDate } = resolveRange(opts.preset ?? "last_28d", opts.dateFrom, opts.dateTo);
  const prev = previousRange(startDate, endDate);
  const limit = Math.min(Math.max(opts.rowLimit ?? 50, 1), 250);

  const properties = await Promise.all(
    usable.map(async (c) => {
      const token = c.refresh_token as string;
      const propertyId = c.ga_property_id as string;
      const dr = [{ startDate, endDate }];

      const dim = async (dims: string[], mets: string[], rows = limit, orderMetric?: string) =>
        rowsToObjects(
          await runReport(token, propertyId, {
            dateRanges: dr,
            dimensions: dims.map((name) => ({ name })),
            metrics: mets.map((name) => ({ name })),
            orderBys: orderMetric ? [{ metric: { metricName: orderMetric }, desc: true }] : undefined,
            limit: rows,
          }),
          dims,
          mets,
        );

      try {
        const [
          totalsRes,
          prevTotalsRes,
          daily,
          channels,
          sourceMedium,
          campaigns,
          landingPages,
          topPages,
          events,
          devices,
          countries,
          cities,
          languages,
          browsers,
          audience,
          newVsReturning,
          hourly,
        ] = await Promise.all([
          runReport(token, propertyId, { dateRanges: dr, metrics: CORE_METRICS.map((name) => ({ name })) }),
          runReport(token, propertyId, {
            dateRanges: [{ startDate: prev.startDate, endDate: prev.endDate }],
            metrics: CORE_METRICS.map((name) => ({ name })),
          }),
          dim(["date"], ["activeUsers", "newUsers", "sessions", "screenPageViews", "conversions"], 400),
          dim(["sessionDefaultChannelGroup"], ["sessions", "activeUsers", "conversions", "engagementRate"], 25, "sessions"),
          dim(["sessionSource", "sessionMedium"], ["sessions", "activeUsers", "conversions"], limit, "sessions"),
          dim(["sessionCampaignName"], ["sessions", "activeUsers", "conversions"], limit, "sessions"),
          dim(["landingPage"], ["sessions", "activeUsers", "bounceRate", "conversions"], limit, "sessions"),
          dim(["pagePath", "pageTitle"], ["screenPageViews", "activeUsers", "averageSessionDuration"], limit, "screenPageViews"),
          dim(["eventName"], ["eventCount", "activeUsers"], limit, "eventCount"),
          dim(["deviceCategory"], ["sessions", "activeUsers", "conversions"], 10, "sessions"),
          dim(["country"], ["sessions", "activeUsers"], 50, "sessions"),
          dim(["city"], ["sessions", "activeUsers"], 50, "sessions"),
          dim(["language"], ["sessions", "activeUsers"], 25, "sessions"),
          dim(["browser"], ["sessions", "activeUsers"], 15, "sessions"),
          dim(["userAgeBracket", "userGender"], ["activeUsers", "sessions"], 40, "activeUsers").catch(() => []),
          dim(["newVsReturning"], ["activeUsers", "sessions", "conversions"], 5, "sessions"),
          dim(["hour"], ["sessions", "activeUsers"], 24),
        ]);

        const totals = totalsToObject(totalsRes, CORE_METRICS);
        const previous = totalsToObject(prevTotalsRes, CORE_METRICS);
        const comparison: Record<string, number> = {};
        CORE_METRICS.forEach((m) => {
          comparison[m] = delta(totals[m] ?? 0, previous[m] ?? 0);
        });

        return {
          connection_id: c.id,
          property_id: propertyId,
          label: c.label,
          google_email: c.google_email,
          totals,
          previous_period: { range: prev, totals: previous },
          comparison_pct: comparison,
          daily,
          channels,
          source_medium: sourceMedium,
          campaigns,
          landing_pages: landingPages,
          top_pages: topPages,
          events,
          devices,
          countries,
          cities,
          languages,
          browsers,
          demographics: audience,
          new_vs_returning: newVsReturning,
          hourly,
        };
      } catch (e) {
        return {
          connection_id: c.id,
          property_id: propertyId,
          label: c.label,
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

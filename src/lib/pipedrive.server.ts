import { supabaseAdmin } from "@/integrations/supabase/client.server";

const PD_AUTH_BASE = "https://oauth.pipedrive.com/oauth";
const PD_OAUTH_ORIGIN = "https://www.dashcompass.com";

export function getPipedriveRedirectUri() {
  return `${PD_OAUTH_ORIGIN}/api/public/pipedrive/oauth/callback`;
}

function getCredentials(): { clientId: string; clientSecret: string } {
  const clientId = process.env.PIPEDRIVE_CLIENT_ID ?? "";
  const clientSecret = process.env.PIPEDRIVE_CLIENT_SECRET ?? "";
  if (!clientId || !clientSecret) {
    throw new Error(
      "PIPEDRIVE_CLIENT_ID / PIPEDRIVE_CLIENT_SECRET não configurados nos secrets do projeto.",
    );
  }
  return { clientId, clientSecret };
}

// -- state signing (HMAC-SHA256) --
function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromBase64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
async function hmacSha256(key: string, message: string): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", k, enc.encode(message));
  return new Uint8Array(sig);
}
function timingSafeEqualBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a[i] ^ b[i];
  return r === 0;
}
function stateSecret() {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.LOVABLE_API_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    "fallback"
  );
}
export async function signPipedriveState(payload: Record<string, unknown>): Promise<string> {
  const body = toBase64Url(
    new TextEncoder().encode(JSON.stringify({ ...payload, ts: Date.now() })),
  );
  const sig = toBase64Url(await hmacSha256(stateSecret(), body));
  return `${body}.${sig}`;
}
export async function verifyPipedriveState(state: string): Promise<Record<string, unknown>> {
  const [body, sig] = state.split(".");
  if (!body || !sig) throw new Error("state inválido");
  const expected = toBase64Url(await hmacSha256(stateSecret(), body));
  if (!timingSafeEqualBytes(new TextEncoder().encode(sig), new TextEncoder().encode(expected))) {
    throw new Error("state assinatura inválida");
  }
  const parsed = JSON.parse(new TextDecoder().decode(fromBase64Url(body)));
  if (typeof parsed.ts !== "number" || Date.now() - parsed.ts > 15 * 60_000) {
    throw new Error("state expirado");
  }
  return parsed;
}

// -- OAuth --

export async function buildPipedriveAuthUrl(reportId: string, userId: string) {
  const { clientId } = getCredentials();
  const state = await signPipedriveState({ reportId, userId });
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getPipedriveRedirectUri(),
    state,
  });
  return `${PD_AUTH_BASE}/authorize?${params.toString()}`;
}

type PipedriveTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope?: string;
  api_domain: string;
  token_type?: string;
};

function basicAuthHeader() {
  const { clientId, clientSecret } = getCredentials();
  return "Basic " + btoa(`${clientId}:${clientSecret}`);
}

export async function exchangePipedriveCode(code: string): Promise<PipedriveTokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: getPipedriveRedirectUri(),
  });
  const res = await fetch(`${PD_AUTH_BASE}/token`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      authorization: basicAuthHeader(),
    },
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`Pipedrive token exchange: ${res.status} ${await res.text()}`);
  return (await res.json()) as PipedriveTokenResponse;
}

export async function refreshPipedriveToken(refreshToken: string): Promise<PipedriveTokenResponse> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  const res = await fetch(`${PD_AUTH_BASE}/token`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      authorization: basicAuthHeader(),
    },
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`Pipedrive refresh: ${res.status} ${await res.text()}`);
  return (await res.json()) as PipedriveTokenResponse;
}

type PipedriveUser = {
  id: number;
  name?: string;
  email?: string;
  company_domain?: string;
};

export async function getPipedriveCurrentUser(
  accessToken: string,
  apiDomain: string,
): Promise<PipedriveUser> {
  const res = await fetch(`${apiDomain}/api/v1/users/me`, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Pipedrive users/me: ${res.status} ${await res.text()}`);
  const json = (await res.json()) as { data: PipedriveUser };
  return json.data;
}

export async function savePipedriveConnection(opts: {
  reportId: string;
  tokens: PipedriveTokenResponse;
  user: PipedriveUser;
}) {
  const expiresAt = new Date(Date.now() + (opts.tokens.expires_in - 60) * 1000).toISOString();
  const { error } = await supabaseAdmin.from("pipedrive_connections").upsert(
    {
      report_id: opts.reportId,
      company_domain: opts.user.company_domain ?? "",
      api_domain: opts.tokens.api_domain,
      access_token: opts.tokens.access_token,
      refresh_token: opts.tokens.refresh_token,
      expires_at: expiresAt,
      pd_user_id: opts.user.id,
      pd_user_name: opts.user.name ?? null,
      pd_user_email: opts.user.email ?? null,
      scope: opts.tokens.scope ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "report_id" },
  );
  if (error) throw new Error(error.message);
}

// -- Admin helpers --

export async function listPipedriveConnectionsImpl(reportId: string) {
  const { data, error } = await supabaseAdmin
    .from("pipedrive_connections")
    .select(
      "id, company_domain, api_domain, pd_user_name, pd_user_email, expires_at, scope, created_at, updated_at",
    )
    .eq("report_id", reportId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function deletePipedriveConnectionImpl(id: string) {
  const { error } = await supabaseAdmin.from("pipedrive_connections").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

// -- CRM metrics for the report dashboard --

type PdConn = {
  id: string;
  report_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  api_domain: string;
};

async function ensureFreshToken(conn: PdConn): Promise<PdConn> {
  if (new Date(conn.expires_at).getTime() > Date.now() + 60_000) return conn;
  const t = await refreshPipedriveToken(conn.refresh_token);
  const expires_at = new Date(Date.now() + (t.expires_in - 60) * 1000).toISOString();
  await supabaseAdmin
    .from("pipedrive_connections")
    .update({
      access_token: t.access_token,
      refresh_token: t.refresh_token,
      expires_at,
      api_domain: t.api_domain,
      updated_at: new Date().toISOString(),
    })
    .eq("id", conn.id);
  return {
    ...conn,
    access_token: t.access_token,
    refresh_token: t.refresh_token,
    expires_at,
    api_domain: t.api_domain,
  };
}

async function pdFetch<T>(conn: PdConn, path: string): Promise<T> {
  const res = await fetch(`${conn.api_domain}${path}`, {
    headers: { authorization: `Bearer ${conn.access_token}` },
  });
  if (!res.ok) throw new Error(`Pipedrive ${path}: ${res.status} ${await res.text()}`);
  return (await res.json()) as T;
}

type TimelinePeriod = {
  period_start: string;
  period_end: string;
  totals: {
    count: number;
    values: Record<string, number>;
    weighted_values?: Record<string, number>;
    open_count?: number;
    won_count?: number;
    lost_count?: number;
  };
};
type TimelineResp = {
  data: TimelinePeriod[] | null;
  additional_data?: {
    summary?: {
      total_count?: number;
      total_values?: Record<string, number>;
    };
  };
};

type DealsSummary = {
  data?: {
    values_total?: Record<string, { value: number; count: number; value_converted: number }>;
    weighted_values_total?: Record<string, { value: number; count: number }>;
    total_count?: number;
    total_currency_converted_value?: number;
    total_weighted_currency_converted_value?: number;
  };
};

type Deal = {
  id: number;
  title: string;
  value: number;
  currency: string;
  status: "open" | "won" | "lost" | "deleted";
  stage_id: number;
  pipeline_id: number;
  add_time: string;
  won_time: string | null;
  lost_time: string | null;
  user_id?: { id: number; name?: string } | number;
  owner_name?: string;
};
type DealsResp = { data: Deal[] | null };

type StagesResp = { data: Array<{ id: number; name: string; pipeline_id: number; order_nr: number }> | null };
type PipelinesResp = { data: Array<{ id: number; name: string; active: boolean }> | null };

export type PipedriveCrmMetrics =
  | { connected: false }
  | {
      connected: true;
      currency: string;
      pdUserName: string | null;
      kpis: {
        newDealsCount: number;
        newDealsValue: number;
        wonCount: number;
        wonValue: number;
        lostCount: number;
        lostValue: number;
        avgTicket: number;
        winRate: number | null;
        openCount: number;
        openValue: number;
        weightedOpenValue: number;
      };
      trend: Array<{ date: string; added: number; won: number; lost: number; wonValue: number }>;
      topOpen: Array<{ id: number; title: string; value: number; currency: string; stage: string; owner: string }>;
      funnel: Array<{ stage: string; pipeline: string; count: number; value: number }>;
      byOwner: Array<{ owner: string; wonCount: number; wonValue: number }>;
      adsLeadStats: {
        hasAds: boolean;
        leads: number;
        spend: number;
        currency: string;
        sources: Array<{ label: string; leads: number; spend: number }>;
      };
    };

function pickCurrency(values: Record<string, number> | undefined): [string, number] {
  if (!values) return ["", 0];
  let best: [string, number] = ["", 0];
  for (const [c, v] of Object.entries(values)) {
    if (v > best[1]) best = [c, v];
  }
  return best;
}

function sumTimeline(tl: TimelineResp): { count: number; value: number; currency: string; daily: Array<{ date: string; count: number; value: number }> } {
  const daily: Array<{ date: string; count: number; value: number }> = [];
  let count = 0;
  let value = 0;
  let currency = "";
  for (const p of tl.data ?? []) {
    const [c, v] = pickCurrency(p.totals?.values);
    if (c && !currency) currency = c;
    const cnt = p.totals?.count ?? 0;
    count += cnt;
    value += v;
    daily.push({ date: (p.period_start ?? "").slice(0, 10), count: cnt, value: v });
  }
  return { count, value, currency, daily };
}

export async function getPipedriveCrmMetricsImpl(
  callerId: string,
  reportId: string,
  dateFrom: string,
  dateTo: string,
): Promise<PipedriveCrmMetrics> {
  const { data: rows } = await supabaseAdmin
    .from("pipedrive_connections")
    .select("id, report_id, access_token, refresh_token, expires_at, api_domain, pd_user_name")
    .eq("report_id", reportId)
    .limit(1);
  if (!rows || rows.length === 0) return { connected: false };
  const pdUserName = (rows[0] as { pd_user_name: string | null }).pd_user_name ?? null;
  const conn = await ensureFreshToken(rows[0] as PdConn);

  const from = new Date(dateFrom + "T00:00:00Z");
  const to = new Date(dateTo + "T00:00:00Z");
  const days = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 86400000) + 1);
  const interval = days > 120 ? "month" : days > 31 ? "week" : "day";
  const amount = interval === "day" ? days : interval === "week" ? Math.ceil(days / 7) : Math.ceil(days / 30);

  const tlParams = (field: string) =>
    `start_date=${dateFrom}&interval=${interval}&amount=${amount}&field_key=${field}&exclude_deals=1&totals_convert_currency=default_currency`;

  const [addedTl, wonTl, lostTl, openSum, pipelinesResp, stagesResp, topOpenResp, wonDealsResp] = await Promise.all([
    pdFetch<TimelineResp>(conn, `/api/v1/deals/timeline?${tlParams("add_time")}`),
    pdFetch<TimelineResp>(conn, `/api/v1/deals/timeline?${tlParams("won_time")}`),
    pdFetch<TimelineResp>(conn, `/api/v1/deals/timeline?${tlParams("lost_time")}`),
    pdFetch<DealsSummary>(conn, `/api/v1/deals/summary?status=open&totals_convert_currency=default_currency`),
    pdFetch<PipelinesResp>(conn, `/api/v1/pipelines`),
    pdFetch<StagesResp>(conn, `/api/v1/stages`),
    pdFetch<DealsResp>(conn, `/api/v1/deals?status=open&sort=value%20DESC&limit=8`),
    pdFetch<DealsResp>(
      conn,
      `/api/v1/deals?status=won&sort=won_time%20DESC&limit=200&start_date=${dateFrom}&end_date=${dateTo}`,
    ),
  ]);

  const added = sumTimeline(addedTl);
  const won = sumTimeline(wonTl);
  const lost = sumTimeline(lostTl);
  const currency = won.currency || added.currency || lost.currency || "BRL";

  const openTotals = openSum.data?.values_total ?? {};
  let openCount = 0;
  let openValue = 0;
  for (const v of Object.values(openTotals)) {
    openCount += v.count ?? 0;
    openValue += v.value_converted ?? v.value ?? 0;
  }
  const weightedOpenValue = openSum.data?.total_weighted_currency_converted_value ?? 0;

  const winRate = won.count + lost.count > 0 ? won.count / (won.count + lost.count) : null;
  const avgTicket = won.count > 0 ? won.value / won.count : 0;

  const trendMap = new Map<string, { date: string; added: number; won: number; lost: number; wonValue: number }>();
  const seed = (date: string) => {
    if (!trendMap.has(date)) trendMap.set(date, { date, added: 0, won: 0, lost: 0, wonValue: 0 });
    return trendMap.get(date)!;
  };
  for (const d of added.daily) seed(d.date).added = d.count;
  for (const d of won.daily) {
    const r = seed(d.date);
    r.won = d.count;
    r.wonValue = d.value;
  }
  for (const d of lost.daily) seed(d.date).lost = d.count;
  const trend = Array.from(trendMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  // Stage / pipeline lookup
  const pipelines = new Map<number, string>();
  for (const p of pipelinesResp.data ?? []) pipelines.set(p.id, p.name);
  const stages = new Map<number, { name: string; pipeline_id: number }>();
  for (const s of stagesResp.data ?? []) stages.set(s.id, { name: s.name, pipeline_id: s.pipeline_id });

  const topOpen = (topOpenResp.data ?? []).slice(0, 8).map((d) => {
    const st = stages.get(d.stage_id);
    return {
      id: d.id,
      title: d.title,
      value: d.value,
      currency: d.currency,
      stage: st?.name ?? "—",
      owner:
        typeof d.user_id === "object" && d.user_id?.name
          ? d.user_id.name
          : (d.owner_name ?? "—"),
    };
  });

  // Funnel: aggregate all open deals per stage (fetch pages)
  const openDeals: Deal[] = [];
  for (let start = 0; start < 2000; start += 500) {
    const page = await pdFetch<DealsResp & { additional_data?: { pagination?: { more_items_in_collection: boolean } } }>(
      conn,
      `/api/v1/deals?status=open&start=${start}&limit=500`,
    );
    const arr = page.data ?? [];
    openDeals.push(...arr);
    if (!page.additional_data?.pagination?.more_items_in_collection) break;
  }
  const funnelMap = new Map<number, { count: number; value: number }>();
  for (const d of openDeals) {
    const cur = funnelMap.get(d.stage_id) ?? { count: 0, value: 0 };
    cur.count += 1;
    cur.value += d.value ?? 0;
    funnelMap.set(d.stage_id, cur);
  }
  const funnel = Array.from(funnelMap.entries())
    .map(([stageId, v]) => {
      const st = stages.get(stageId);
      return {
        stage: st?.name ?? `Etapa ${stageId}`,
        pipeline: st ? (pipelines.get(st.pipeline_id) ?? "—") : "—",
        count: v.count,
        value: v.value,
      };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 12);

  // By owner (won this period)
  const ownerMap = new Map<string, { wonCount: number; wonValue: number }>();
  for (const d of wonDealsResp.data ?? []) {
    const name =
      typeof d.user_id === "object" && d.user_id?.name
        ? d.user_id.name
        : (d.owner_name ?? "—");
    const cur = ownerMap.get(name) ?? { wonCount: 0, wonValue: 0 };
    cur.wonCount += 1;
    cur.wonValue += d.value ?? 0;
    ownerMap.set(name, cur);
  }
  const byOwner = Array.from(ownerMap.entries())
    .map(([owner, v]) => ({ owner, ...v }))
    .sort((a, b) => b.wonValue - a.wonValue)
    .slice(0, 8);

  // Cruzar com Meta Ads (leads + spend) para medir qualidade de leads
  const adsLeadStats = await computeAdsLeadStats(callerId, reportId, { dateFrom, dateTo });

  return {
    connected: true,
    currency,
    pdUserName,
    kpis: {
      newDealsCount: added.count,
      newDealsValue: added.value,
      wonCount: won.count,
      wonValue: won.value,
      lostCount: lost.count,
      lostValue: lost.value,
      avgTicket,
      winRate,
      openCount,
      openValue,
      weightedOpenValue,
    },
    trend,
    topOpen,
    funnel,
    byOwner,
    adsLeadStats,
  };
}

async function computeAdsLeadStats(
  callerId: string,
  reportId: string,
  range: { dateFrom: string; dateTo: string },
): Promise<{
  hasAds: boolean;
  leads: number;
  spend: number;
  currency: string;
  sources: Array<{ label: string; leads: number; spend: number }>;
}> {
  try {
    const { getReportMetricsImpl } = await import("./windsor.server");
    const groups = await getReportMetricsImpl(callerId, reportId, range);
    const adGroups = groups.filter(
      (g) =>
        g.connector === "facebook_ads" ||
        g.connector === "google_ads" ||
        g.connector === "tiktok_ads" ||
        g.connector === "linkedin_ads",
    );
    let leads = 0;
    let spend = 0;
    const sources: Array<{ label: string; leads: number; spend: number }> = [];
    for (const g of adGroups) {
      const l = Number(g.metrics?.actions_lead ?? g.derived?.leads_calc ?? 0) || 0;
      const s = Number(g.metrics?.spend ?? g.metrics?.cost ?? 0) || 0;
      if (l === 0 && s === 0) continue;
      leads += l;
      spend += s;
      sources.push({
        label: `${g.connector}${g.account_name ? ` · ${g.account_name}` : ""}`,
        leads: l,
        spend: s,
      });
    }
    return { hasAds: sources.length > 0, leads, spend, currency: "BRL", sources };
  } catch {
    return { hasAds: false, leads: 0, spend: 0, currency: "BRL", sources: [] };
  }
}


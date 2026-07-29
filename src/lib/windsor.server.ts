import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(callerId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", callerId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Forbidden: admin only");
}

async function assertReportAccess(callerId: string, reportId: string) {
  const { data: admin } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", callerId)
    .eq("role", "admin")
    .maybeSingle();
  if (admin) return;

  const { data: report } = await supabaseAdmin
    .from("reports")
    .select("company_id")
    .eq("id", reportId)
    .maybeSingle();
  if (!report) throw new Error("Report not found");

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("company_id")
    .eq("id", callerId)
    .maybeSingle();
  if (!profile || profile.company_id !== report.company_id) {
    throw new Error("Forbidden");
  }
}

export const SUPPORTED_CONNECTORS = [
  { id: "instagram", label: "Instagram" },
  { id: "facebook", label: "Facebook Organic" },
  { id: "facebook_ads", label: "Meta Ads" },
  { id: "adwords", label: "Google Ads" },
  { id: "ga4", label: "Google Analytics 4" },
  { id: "tiktok", label: "TikTok Ads" },
  { id: "tiktok_organic", label: "TikTok" },
  { id: "linkedin", label: "LinkedIn Ads" },
  { id: "searchconsole", label: "Google Search Console" },
] as const;

const CONNECTOR_METRICS: Record<string, string[]> = {
  instagram: [
    "followers_count", "follows_count", "media_count",
    "reach", "impressions", "views", "profile_views",
    "accounts_engaged", "total_interactions",
    "likes", "comments", "saves", "shares", "replies",
  ],
  facebook: [
    "page_fans", "page_impressions", "page_reach", "page_engaged_users",
    "page_post_engagements", "page_video_views", "page_views_total",
  ],
  facebook_ads: [
    "spend", "impressions", "reach", "frequency", "clicks", "ctr", "cpc", "cpm",
    "conversions", "cost_per_conversion", "actions_lead", "cost_per_action_type_lead",
    "campaign",
  ],
  adwords: [
    "cost", "impressions", "clicks", "ctr", "average_cpc", "average_cpm",
    "conversions", "conversion_value", "cost_per_conversion", "all_conversions",
    "search_impression_share",
  ],
  ga4: [
    "sessions", "users", "newUsers", "activeUsers", "screenPageViews",
    "engagementRate", "averageSessionDuration", "bounceRate",
    "conversions", "eventCount", "totalRevenue",
  ],
  tiktok: [
    "spend", "impressions", "reach", "clicks", "ctr", "cpc", "cpm",
    "video_views", "video_views_p25", "video_views_p50", "video_views_p75", "video_views_p100",
    "likes", "comments", "shares", "follows", "profile_visits",
  ],
  linkedin: [
    "cost", "impressions", "clicks", "ctr", "average_cpc",
    "reactions", "comments", "shares", "follows", "video_views",
  ],
  searchconsole: [
    "clicks", "impressions", "ctr", "position",
  ],
};

// Fields that shouldn't be summed — average instead
const RATE_FIELDS = new Set([
  "ctr", "cpc", "average_cpc", "cpm", "average_cpm", "engagementRate",
  "bounceRate", "frequency", "roas", "cost_per_conversion",
  "averageSessionDuration", "search_impression_share", "position",
]);
// Fields that represent a snapshot / running total — take last value, not sum
const SNAPSHOT_FIELDS = new Set(["followers_count", "follows_count", "media_count", "page_fans"]);

const WINDSOR_BASE = "https://connectors.windsor.ai";
const CACHE_TTL_SECONDS = 60 * 60; // 1 hour

async function windsorKey() {
  try {
    const { data } = await supabaseAdmin
      .from("app_settings")
      .select("value")
      .eq("key", "windsor_api_key")
      .maybeSingle();
    if (data?.value) return data.value;
  } catch {
    // fall back to env
  }
  const key = process.env.WINDSOR_API_KEY;
  if (!key) throw new Error("WINDSOR_API_KEY not configured");
  return key;
}

export async function getWindsorKeyStatusImpl(callerId: string) {
  await assertAdmin(callerId);
  const { data } = await supabaseAdmin
    .from("app_settings")
    .select("value, updated_at")
    .eq("key", "windsor_api_key")
    .maybeSingle();
  const dbKey = data?.value ?? null;
  const envKey = process.env.WINDSOR_API_KEY ?? null;
  return {
    hasKey: !!(dbKey || envKey),
    source: dbKey ? "database" : envKey ? "env" : null,
    masked: dbKey ? `${dbKey.slice(0, 4)}…${dbKey.slice(-4)}` : envKey ? `${envKey.slice(0, 4)}…${envKey.slice(-4)}` : null,
    updatedAt: data?.updated_at ?? null,
  };
}

export async function setWindsorKeyImpl(callerId: string, value: string) {
  await assertAdmin(callerId);
  const clean = value.trim();
  if (!clean) throw new Error("Chave vazia");
  const { error } = await supabaseAdmin
    .from("app_settings")
    .upsert({ key: "windsor_api_key", value: clean, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
  await supabaseAdmin.from("windsor_cache").delete().neq("cache_key", "");
  return { ok: true };
}

export async function clearWindsorCacheImpl(callerId: string) {
  await assertAdmin(callerId);
  const { error } = await supabaseAdmin.from("windsor_cache").delete().neq("cache_key", "");
  if (error) throw new Error(error.message);
  return { ok: true };
}

async function withCache<T>(
  key: string,
  reportId: string | null,
  fn: () => Promise<T>,
  opts: { skipWriteIf?: (result: T) => boolean } = {},
): Promise<T> {
  const nowIso = new Date().toISOString();
  try {
    const { data } = await supabaseAdmin
      .from("windsor_cache")
      .select("payload")
      .eq("cache_key", key)
      .gt("expires_at", nowIso)
      .maybeSingle();
    if (data?.payload) return data.payload as T;
  } catch {
    // ignore cache read errors, fall through to fetch
  }
  const result = await fn();
  if (opts.skipWriteIf?.(result)) return result;
  const expires = new Date(Date.now() + CACHE_TTL_SECONDS * 1000).toISOString();
  try {
    await supabaseAdmin
      .from("windsor_cache")
      .upsert({ cache_key: key, report_id: reportId, payload: result as never, expires_at: expires });
  } catch {
    // ignore cache write errors
  }
  return result;
}

function rangeKey(range: { datePreset?: string; dateFrom?: string; dateTo?: string }): string {
  return range.dateFrom && range.dateTo
    ? `${range.dateFrom}_${range.dateTo}`
    : (range.datePreset ?? "last_30d");
}

const WINDSOR_SLUG: Record<string, string> = {
  facebook_ads: "facebook", // Windsor uses "facebook" for Meta Ads + Pages
};

function windsorSlug(connector: string): string {
  return WINDSOR_SLUG[connector] ?? connector;
}

export async function listWindsorAccountsImpl(callerId: string, connector: string) {
  await assertAdmin(callerId);
  const fields = ["account_id", "account_name"].join(",");
  const slug = windsorSlug(connector);
  const key = await windsorKey();
  const seen = new Map<string, string>();

  // Try several date windows so newly-connected accounts (still without history)
  // also appear. Windsor only returns accounts that have data in the requested window.
  const attempts = [
    `${WINDSOR_BASE}/${encodeURIComponent(slug)}?api_key=${key}&fields=${fields}&date_preset=last_y`,
    `${WINDSOR_BASE}/${encodeURIComponent(slug)}?api_key=${key}&fields=${fields}&date_preset=last_30d`,
    `${WINDSOR_BASE}/${encodeURIComponent(slug)}?api_key=${key}&fields=${fields}&date_preset=last_7d`,
    `${WINDSOR_BASE}/${encodeURIComponent(slug)}?api_key=${key}&fields=${fields}`,
  ];

  let lastError: string | null = null;
  for (const url of attempts) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      lastError = `Windsor error (${res.status}): ${(await res.text()).slice(0, 200)}`;
      continue;
    }
    const json = (await res.json()) as {
      data?: Array<{ account_id?: string | number; account_name?: string }>;
      error?: string;
    };
    if (json.error) {
      lastError = json.error;
      continue;
    }
    for (const row of json.data ?? []) {
      if (row.account_id == null) continue;
      const id = String(row.account_id);
      if (!seen.has(id)) seen.set(id, row.account_name ?? id);
    }
  }

  if (seen.size === 0 && lastError) throw new Error(lastError);
  return Array.from(seen.entries()).map(([account_id, account_name]) => ({ account_id, account_name }));
}


export async function listConnectionsImpl(callerId: string, reportId: string) {
  await assertReportAccess(callerId, reportId);
  const { data, error } = await supabaseAdmin
    .from("windsor_connections")
    .select("id, connector, account_id, account_name, created_at")
    .eq("report_id", reportId)
    .order("connector");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function addConnectionImpl(
  callerId: string,
  input: { reportId: string; connector: string; account_id: string; account_name: string | null },
) {
  await assertAdmin(callerId);
  const { data, error } = await supabaseAdmin
    .from("windsor_connections")
    .insert({
      report_id: input.reportId,
      connector: input.connector,
      account_id: input.account_id,
      account_name: input.account_name,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return { id: data.id };
}

export async function deleteConnectionImpl(callerId: string, id: string) {
  await assertAdmin(callerId);
  const { error } = await supabaseAdmin.from("windsor_connections").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export type DailyRow = { date: string } & Record<string, number | string | null>;

export type Insight = {
  level: "success" | "warning" | "danger" | "info";
  title: string;
  detail: string;
  metric?: string;
};

export type WindsorMetricGroup = {
  connector: string;
  account_id: string;
  account_name: string | null;
  metrics: Record<string, number | null>;
  previous: Record<string, number | null>;
  derived: Record<string, number | null>;
  derivedPrevious: Record<string, number | null>;
  insights: Insight[];
  daily: DailyRow[];
  error?: string;
};

function safeDiv(a: number | null | undefined, b: number | null | undefined): number | null {
  if (a == null || b == null || !b || Number.isNaN(a) || Number.isNaN(b)) return null;
  return a / b;
}

export function computeDerived(connector: string, m: Record<string, number | null>): Record<string, number | null> {
  const d: Record<string, number | null> = {};
  if (connector === "instagram") {
    const engRate = safeDiv(m.total_interactions, m.reach);
    if (engRate != null) d.engagement_rate = engRate * 100;
    const saveRate = safeDiv(m.saves, m.reach);
    if (saveRate != null) d.save_rate = saveRate * 100;
    const shareRate = safeDiv(m.shares, m.reach);
    if (shareRate != null) d.share_rate = shareRate * 100;
  }
  if (connector === "facebook_ads" || connector === "tiktok" || connector === "linkedin" || connector === "tiktok_organic") {
    const spend = m.spend ?? m.cost ?? null;
    d.cpa_calc = safeDiv(spend, m.conversions);
    d.roas_calc = safeDiv(m.conversion_value ?? null, spend);
    d.cost_per_engaged = safeDiv(spend, m.accounts_engaged ?? m.clicks);
    const p100 = m.video_p100_watched ?? m.video_views_p100 ?? null;
    const p0 = m.video_views ?? null;
    const retention = safeDiv(p100, p0);
    if (retention != null) d.video_retention = retention * 100;
    // Meta Ads: quando a Windsor devolve CPL mas não o count de leads,
    // derivamos leads = spend / CPL (arredondado).
    if (connector === "facebook_ads" && (m.actions_lead == null || m.actions_lead === 0)) {
      const cpl = m.cost_per_action_type_lead ?? null;
      const leads = safeDiv(spend, cpl);
      if (leads != null && Number.isFinite(leads)) d.leads_calc = Math.round(leads);
    }
  }
  if (connector === "adwords") {
    d.cpa_calc = safeDiv(m.cost, m.conversions);
    d.roas_calc = safeDiv(m.conversion_value, m.cost);
  }
  if (connector === "ga4") {
    const pagesPerSession = safeDiv(m.screenPageViews, m.sessions);
    if (pagesPerSession != null) d.pages_per_session = pagesPerSession;
    const convRate = safeDiv(m.conversions, m.sessions);
    if (convRate != null) d.conversion_rate = convRate * 100;
    const revenuePerUser = safeDiv(m.totalRevenue, m.activeUsers ?? m.users);
    if (revenuePerUser != null) d.revenue_per_user = revenuePerUser;
  }
  if (connector === "tiktok_organic") {
    const engRate = safeDiv((m.likes || 0) + (m.comments || 0) + (m.shares || 0), m.video_views);
    if (engRate != null) d.engagement_rate = engRate * 100;
  }
  return d;
}

function pct(curr: number | null | undefined, prev: number | null | undefined): number | null {
  if (curr == null || prev == null || !prev) return null;
  return ((curr - prev) / Math.abs(prev)) * 100;
}

export function buildInsights(
  connector: string,
  metrics: Record<string, number | null>,
  previous: Record<string, number | null>,
  derived: Record<string, number | null>,
): Insight[] {
  const out: Insight[] = [];
  const watch: Array<{ field: string; label: string; goodUp: boolean }> = [];
  if (connector === "instagram") {
    watch.push(
      { field: "reach", label: "Alcance", goodUp: true },
      { field: "followers_count", label: "Seguidores", goodUp: true },
      { field: "total_interactions", label: "Interações", goodUp: true },
    );
  } else if (connector === "facebook_ads" || connector === "adwords" || connector === "tiktok" || connector === "linkedin") {
    watch.push(
      { field: "spend", label: "Investimento", goodUp: true },
      { field: "cost", label: "Investimento", goodUp: true },
      { field: "conversions", label: "Conversões", goodUp: true },
      { field: "cpm", label: "CPM", goodUp: false },
      { field: "average_cpm", label: "CPM", goodUp: false },
    );
  } else if (connector === "ga4") {
    watch.push(
      { field: "activeUsers", label: "Usuários ativos", goodUp: true },
      { field: "sessions", label: "Sessões", goodUp: true },
      { field: "conversions", label: "Conversões", goodUp: true },
      { field: "bounceRate", label: "Rejeição", goodUp: false },
    );
  }
  for (const w of watch) {
    const change = pct(metrics[w.field], previous[w.field]);
    if (change == null || Math.abs(change) < 20) continue;
    const good = w.goodUp ? change > 0 : change < 0;
    out.push({
      level: good ? "success" : Math.abs(change) > 40 ? "danger" : "warning",
      title: `${w.label} ${change > 0 ? "+" : ""}${change.toFixed(1)}% vs período anterior`,
      detail: good ? "Movimento positivo." : "Tendência de atenção — investigar causa.",
      metric: w.field,
    });
  }
  // Frequency fatigue
  if (metrics.frequency && metrics.frequency > 3) {
    out.push({
      level: "warning",
      title: `Frequência alta (${metrics.frequency.toFixed(1)})`,
      detail: "Sinal clássico de fadiga criativa. Considere renovar criativos ou ampliar audiência.",
      metric: "frequency",
    });
  }
  // Bounce rate
  if (metrics.bounceRate && metrics.bounceRate > 70) {
    out.push({
      level: "warning",
      title: `Taxa de rejeição elevada (${metrics.bounceRate.toFixed(1)}%)`,
      detail: "Landing page ou match de mensagem com anúncio pode estar fraco.",
      metric: "bounceRate",
    });
  }
  // Engagement rate benchmark (IG)
  if (derived.engagement_rate != null) {
    if (derived.engagement_rate < 1) {
      out.push({
        level: "warning",
        title: `Engagement rate baixo (${derived.engagement_rate.toFixed(2)}%)`,
        detail: "Abaixo do benchmark de 1–3%. Reveja formato, gancho e horário de publicação.",
        metric: "engagement_rate",
      });
    } else if (derived.engagement_rate > 5) {
      out.push({
        level: "success",
        title: `Engagement rate excelente (${derived.engagement_rate.toFixed(2)}%)`,
        detail: "Muito acima do benchmark. Escale o formato/tema vencedor.",
        metric: "engagement_rate",
      });
    }
  }
  // ROAS
  const roas = derived.roas_calc ?? metrics.roas ?? null;
  if (roas != null) {
    if (roas < 1) {
      out.push({
        level: "danger",
        title: `ROAS negativo (${roas.toFixed(2)}x)`,
        detail: "Campanha gastando mais do que retorna. Pausar ou otimizar segmentação/criativo.",
        metric: "roas",
      });
    } else if (roas > 3) {
      out.push({
        level: "success",
        title: `ROAS forte (${roas.toFixed(2)}x)`,
        detail: "Oportunidade de escalar budget mantendo eficiência.",
        metric: "roas",
      });
    }
  }
  return out.slice(0, 6);
}

export type WindsorRange = { datePreset?: string; dateFrom?: string; dateTo?: string };

function daysBetween(from: string, to: string): number {
  const a = new Date(from + "T00:00:00Z").getTime();
  const b = new Date(to + "T00:00:00Z").getTime();
  return Math.max(1, Math.round((b - a) / 86400000) + 1);
}

function shiftDate(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function presetToDays(preset: string): number {
  const md = /^last_(\d+)d$/.exec(preset);
  if (md) return parseInt(md[1], 10);
  const mm = /^last_(\d+)m$/.exec(preset);
  if (mm) return parseInt(mm[1], 10) * 30;
  if (preset === "last_y" || preset === "last_year") return 365;
  return 30;
}

function previousRange(range: WindsorRange): WindsorRange {
  if (range.dateFrom && range.dateTo) {
    const days = daysBetween(range.dateFrom, range.dateTo);
    const prevTo = shiftDate(range.dateFrom, -1);
    const prevFrom = shiftDate(prevTo, -(days - 1));
    return { dateFrom: prevFrom, dateTo: prevTo };
  }
  const preset = range.datePreset ?? "last_30d";
  const md = /^last_(\d+)d$/.exec(preset);
  if (md) return { datePreset: `last_${parseInt(md[1], 10) * 2}d` };
  const mm = /^last_(\d+)m$/.exec(preset);
  if (mm) return { datePreset: `last_${parseInt(mm[1], 10) * 2}m` };
  if (preset === "this_month") return { datePreset: "last_month" };
  return { datePreset: "last_60d" };
}

// Meta Ads: CPL considera apenas campanhas de leads (qualquer campanha que
// gerou ≥1 lead no período). Soma o spend de TODOS os dias dessas campanhas
// — inclusive dias com 0 leads — para não subestimar o custo.
function computeLeadCampaignCpl(
  rows: Array<Record<string, unknown>>,
): { leads: number; spend: number; cpl: number } | null {
  const leadCampaigns = new Set<string>();
  for (const r of rows) {
    const leads = toNum(r.actions_lead) ?? 0;
    const camp = typeof r.campaign === "string" ? r.campaign : "";
    if (leads > 0 && camp) leadCampaigns.add(camp);
  }
  if (leadCampaigns.size === 0) return null;
  let leads = 0;
  let spend = 0;
  for (const r of rows) {
    const camp = typeof r.campaign === "string" ? r.campaign : "";
    if (!leadCampaigns.has(camp)) continue;
    leads += toNum(r.actions_lead) ?? 0;
    spend += toNum(r.spend) ?? 0;
  }
  if (leads <= 0) return null;
  return { leads, spend, cpl: spend / leads };
}

function toNum(v: unknown): number | null {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    // Windsor sometimes returns numerics as strings ("1234" or "12,34")
    const n = Number(v.replace(/,/g, "."));
    if (!Number.isNaN(n)) return n;
  }
  return null;
}

function aggregate(rows: Array<Record<string, unknown>>, fields: string[]): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  for (const f of fields) {
    const nums = rows
      .map((r) => toNum(r[f]))
      .filter((v): v is number => v !== null);
    if (nums.length === 0) {
      out[f] = null;
    } else if (SNAPSHOT_FIELDS.has(f)) {
      out[f] = nums[nums.length - 1];
    } else if (RATE_FIELDS.has(f)) {
      out[f] = nums.reduce((a, b) => a + b, 0) / nums.length;
    } else {
      out[f] = nums.reduce((a, b) => a + b, 0);
    }
  }
  return out;
}

// Rate fields returned per-row must be recomputed from summed totals, because
// averaging per-row rates (or averaging fractional CTRs like 0.02 = 2%) yields
// wrong values (e.g. CTR shown as 0.02% instead of 2%).
function normalizeRates(connector: string, m: Record<string, number | null>): void {
  const spend = m.spend ?? m.cost ?? null;
  const clicks = m.clicks ?? null;
  const impressions = m.impressions ?? null;
  if (["facebook_ads", "adwords", "tiktok", "linkedin"].includes(connector)) {
    if (clicks != null && impressions && impressions > 0) {
      m.ctr = (clicks / impressions) * 100;
    }
    if (spend != null && clicks && clicks > 0) {
      const cpc = spend / clicks;
      if ("cpc" in m) m.cpc = cpc;
      if ("average_cpc" in m) m.average_cpc = cpc;
    }
    if (spend != null && impressions && impressions > 0) {
      const cpm = (spend / impressions) * 1000;
      if ("cpm" in m) m.cpm = cpm;
      if ("average_cpm" in m) m.average_cpm = cpm;
    }
  }
}

function rangeParams(range: WindsorRange): string {
  if (range.dateFrom && range.dateTo) {
    return `date_from=${encodeURIComponent(range.dateFrom)}&date_to=${encodeURIComponent(range.dateTo)}`;
  }
  return `date_preset=${encodeURIComponent(range.datePreset ?? "last_30d")}`;
}

async function fetchWindsor(connector: string, accountId: string, fields: string[], range: WindsorRange, withDate: boolean) {
  const key = await windsorKey();
  const fieldSet = new Set<string>(fields);
  fieldSet.add("account_id");
  if (withDate) fieldSet.add("date");
  const fieldList = Array.from(fieldSet);
  const url = `${WINDSOR_BASE}/${encodeURIComponent(windsorSlug(connector))}?api_key=${key}&fields=${fieldList.join(",")}&${rangeParams(range)}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Windsor ${res.status}: ${text.slice(0, 120)}`);
  }
  const json = (await res.json()) as { data?: Array<Record<string, unknown>>; error?: string };
  if (json.error) throw new Error(json.error);
  const wanted = String(accountId);
  return (json.data ?? []).filter((r) => String(r.account_id ?? "") === wanted);
}

export async function getReportMetricsImpl(
  callerId: string,
  reportId: string,
  range: WindsorRange = { datePreset: "last_30d" },
): Promise<WindsorMetricGroup[]> {
  await assertReportAccess(callerId, reportId);
  return withCache(`metrics-v15:${reportId}:${rangeKey(range)}`, reportId, async () => {

  const { data: conns, error } = await supabaseAdmin
    .from("windsor_connections")
    .select("connector, account_id, account_name")
    .eq("report_id", reportId);
  if (error) throw new Error(error.message);
  const windsorConns = conns ?? [];


  const results = await Promise.all(
    windsorConns.map(async (c): Promise<WindsorMetricGroup> => {
      const fields = CONNECTOR_METRICS[c.connector] ?? [];
      try {
        const rows = await fetchWindsor(c.connector, c.account_id, fields, range, true);

        const dailyMap = new Map<string, Record<string, number>>();
        for (const r of rows) {
          const date = String(r.date ?? "").slice(0, 10);
          if (!date) continue;
          const bucket = dailyMap.get(date) ?? {};
          for (const f of fields) {
            const v = toNum(r[f]);
            if (v !== null) {
              if (RATE_FIELDS.has(f) || SNAPSHOT_FIELDS.has(f)) {
                bucket[f] = v;
              } else {
                bucket[f] = (bucket[f] ?? 0) + v;
              }
            }
          }
          dailyMap.set(date, bucket);
        }
        const daily: DailyRow[] = Array.from(dailyMap.entries())
          .sort(([a], [b]) => (a < b ? -1 : 1))
          .map(([date, vals]) => {
            // Per-row CTR/CPC/CPM from Windsor cannot be summed or picked from
            // the last row — recompute per day from summed clicks/impressions/spend
            // so the daily chart matches the aggregate KPI.
            const row: Record<string, number | null> = { ...vals };
            normalizeRates(c.connector, row);
            return { date, ...row } as DailyRow;
          });

        const metrics = aggregate(rows, fields);
        normalizeRates(c.connector, metrics);
        if (c.connector === "facebook_ads") {
          const lc = computeLeadCampaignCpl(rows);
          if (lc) {
            metrics.actions_lead = lc.leads;
            metrics.cost_per_action_type_lead = lc.cpl;
          }
        }

        let previous: Record<string, number | null> = {};
        try {
          const prev = previousRange(range);
          const prevRows = await fetchWindsor(c.connector, c.account_id, fields, prev, true);
          let prevSubset = prevRows;
          if (prev.dateFrom && prev.dateTo) {
            previous = aggregate(prevRows, fields);
          } else {
            const days = presetToDays(range.datePreset ?? "last_30d");
            const sorted = prevRows
              .filter((r) => typeof r.date === "string")
              .sort((a, b) => (String(a.date) < String(b.date) ? -1 : 1));
            const cutoff = sorted.length > days ? sorted.length - days : Math.floor(sorted.length / 2);
            prevSubset = sorted.slice(0, cutoff);
            previous = aggregate(prevSubset, fields);
          }
          normalizeRates(c.connector, previous);
          if (c.connector === "facebook_ads") {
            const lc = computeLeadCampaignCpl(prevSubset);
            if (lc) {
              previous.actions_lead = lc.leads;
              previous.cost_per_action_type_lead = lc.cpl;
            }
          }
        } catch {
          previous = {};
        }

        // Snapshot fields (followers_count, page_fans, …) often return only the
        // current value from Windsor, leaving `previous` empty. Fall back to the
        // earliest daily snapshot inside the current range so the delta vs the
        // previous period still renders.
        for (const f of fields) {
          if (!SNAPSHOT_FIELDS.has(f)) continue;
          if (previous[f] != null) continue;
          const sortedCur = [...daily].sort((a, b) => (a.date < b.date ? -1 : 1));
          const firstVal = sortedCur
            .map((r) => toNum((r as Record<string, unknown>)[f]))
            .find((v): v is number => v !== null);
          if (firstVal != null) previous[f] = firstVal;
        }

        const derived = computeDerived(c.connector, metrics);
        const derivedPrevious = computeDerived(c.connector, previous);
        const insights = buildInsights(c.connector, metrics, previous, derived);

        return { connector: c.connector, account_id: c.account_id, account_name: c.account_name, metrics, previous, derived, derivedPrevious, insights, daily };
      } catch (e) {
        return {
          connector: c.connector,
          account_id: c.account_id,
          account_name: c.account_name,
          metrics: {},
          previous: {},
          derived: {},
          derivedPrevious: {},
          insights: [],
          daily: [],
          error: (e as Error).message,
        };
      }
    }),
  );

  // Fallback: para conectores Meta sem vínculo Windsor, puxar via Graph API
  // usando o token OAuth salvo em meta_connections.
  const covered = new Set(windsorConns.map((c) => `${c.connector}::${c.account_id}`));
  try {
    const { fetchMetaGraphGroups } = await import("./meta-graph.server");
    const graphGroups = await fetchMetaGraphGroups(reportId, range, covered);
    results.push(...graphGroups);
  } catch {
    // silencioso: mantém apenas Windsor caso a integração Meta falhe
  }

  // Novo: Buscar métricas do TikTok Orgânico caso exista conexão
  try {
    const { fetchTiktokMetricGroups } = await import("./tiktok.server");
    const tiktokGroups = await fetchTiktokMetricGroups(reportId, range);
    results.push(...tiktokGroups);
  } catch (err) {
    console.error("Erro ao buscar TikTok Orgânico:", err);
  }

  return results;
  });
}


// ---------------- Top posts (Instagram) ----------------

export type TopPost = {
  media_id: string;
  account_id: string;
  account_name: string | null;
  media_type: string | null;
  caption: string | null;
  permalink: string | null;
  thumbnail: string | null;
  timestamp: string | null;
  likes: number;
  comments: number;
  shares: number;
  saved: number;
  reach: number;
  views: number;
  engagement: number;
};

const INSTAGRAM_POST_FIELDS = [
  "account_id",
  "account_name",
  "media_id",
  "media_type",
  "media_caption",
  "media_permalink",
  "media_thumbnail_url",
  "media_url",
  "media_like_count",
  "media_comments_count",
  "media_engagement",
  "media_reach",
  "media_saved",
  "media_shares",
  "media_views",
  "timestamp",
];

function num(v: unknown): number {
  return typeof v === "number" && !Number.isNaN(v) ? v : 0;
}

export async function getTopInstagramPostsImpl(
  callerId: string,
  reportId: string,
  range: WindsorRange = { datePreset: "last_30d" },
  limit = 6,
  sortBy: "engagement" | "reach" | "likes" | "views" = "engagement",
): Promise<Array<TopPost & { connector: string }>> {
  await assertReportAccess(callerId, reportId);
  return withCache(`topposts-v2:${reportId}:${rangeKey(range)}:${sortBy}:${limit}`, reportId, async () => {

  const { data: conns, error } = await supabaseAdmin
    .from("windsor_connections")
    .select("connector, account_id, account_name")
    .eq("report_id", reportId)
    .eq("connector", "instagram");
  if (error) throw new Error(error.message);

  const posts: Array<TopPost & { connector: string }> = [];
  const seen = new Set<string>();
  const coveredAccounts = new Set<string>();

  if (conns && conns.length > 0) {
    const key = await windsorKey();
    const url = `${WINDSOR_BASE}/instagram?api_key=${key}&fields=${INSTAGRAM_POST_FIELDS.join(",")}&${rangeParams(range)}`;
    const res = await fetch(url);
    if (res.ok) {
      const json = (await res.json()) as { data?: Array<Record<string, unknown>>; error?: string };
      if (!json.error) {
        const allowed = new Set(conns.map((c) => String(c.account_id)));
        for (const r of json.data ?? []) {
          const accId = String(r.account_id ?? "");
          if (!allowed.has(accId)) continue;
          const mediaId = String(r.media_id ?? "");
          if (!mediaId || seen.has(mediaId)) continue;
          seen.add(mediaId);
          coveredAccounts.add(accId);
          posts.push({
            connector: "instagram",
            media_id: mediaId,
            account_id: accId,
            account_name: (r.account_name as string) ?? null,
            media_type: (r.media_type as string) ?? null,
            caption: (r.media_caption as string) ?? null,
            permalink: (r.media_permalink as string) ?? null,
            thumbnail: ((r.media_thumbnail_url as string) || (r.media_url as string)) ?? null,
            timestamp: (r.timestamp as string) ?? null,
            likes: num(r.media_like_count),
            comments: num(r.media_comments_count),
            shares: num(r.media_shares),
            saved: num(r.media_saved),
            reach: num(r.media_reach),
            views: num(r.media_views),
            engagement: num(r.media_engagement),
          });
        }
      }
    }
  }

  // Fallback / complement: native Meta OAuth (Graph API)
  try {
    const { fetchMetaGraphTopPosts } = await import("./meta-graph.server");
    const extra = await fetchMetaGraphTopPosts(reportId, range, coveredAccounts, 200, sortBy);
    for (const p of extra) {
      if (seen.has(p.media_id)) continue;
      seen.add(p.media_id);
      posts.push(p);
    }
  } catch {
    // ignore
  }

  posts.sort((a, b) => (b[sortBy] || 0) - (a[sortBy] || 0));
  return posts.slice(0, limit);
  });
}


export type AudienceBreakdown = { label: string; value: number };
export type InstagramAudience = {
  account_id: string;
  account_name: string | null;
  gender: AudienceBreakdown[];
  age: AudienceBreakdown[];
  gender_age: AudienceBreakdown[];
  city: AudienceBreakdown[];
  country: AudienceBreakdown[];
};

async function fetchAudienceField(
  accountId: string,
  nameField: string,
  sizeField: string,
): Promise<AudienceBreakdown[]> {
  try {
    const key = await windsorKey();
    const url = `${WINDSOR_BASE}/instagram?api_key=${key}&fields=account_id,${nameField},${sizeField}&date_preset=last_30d`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = (await res.json()) as { data?: Array<Record<string, unknown>>; error?: string };
    if (json.error) return [];
    const wanted = String(accountId);
    const agg = new Map<string, number>();
    for (const r of json.data ?? []) {
      if (String(r.account_id ?? "") !== wanted) continue;
      const label = r[nameField];
      const val = r[sizeField];
      if (label == null) continue;
      const n = typeof val === "number" ? val : Number(val);
      if (!Number.isFinite(n) || n <= 0) continue;
      const k = String(label);
      agg.set(k, (agg.get(k) ?? 0) + n);
    }
    return Array.from(agg.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  } catch {
    return [];
  }
}

export async function getInstagramAudienceImpl(
  callerId: string,
  reportId: string,
): Promise<InstagramAudience[]> {
  await assertReportAccess(callerId, reportId);
  return withCache(`audience-v3:${reportId}`, reportId, async () => {
    const { data: conns, error } = await supabaseAdmin
      .from("windsor_connections")
      .select("account_id, account_name")
      .eq("report_id", reportId)
      .eq("connector", "instagram");
    if (error) throw new Error(error.message);

    const results: InstagramAudience[] = [];
    const covered = new Set<string>();
    for (const c of conns ?? []) {
      const accId = String(c.account_id);
      const [gender, age, genderAge, city, country] = await Promise.all([
        fetchAudienceField(accId, "audience_gender_name", "audience_gender_size"),
        fetchAudienceField(accId, "audience_age_name", "audience_age_size"),
        fetchAudienceField(accId, "audience_gender_age_name", "audience_gender_age_size"),
        fetchAudienceField(accId, "city", "audience_city_size"),
        fetchAudienceField(accId, "audience_country_name", "audience_country_size"),
      ]);
      const has = gender.length + age.length + city.length + country.length + genderAge.length > 0;
      if (has) {
        results.push({
          account_id: accId,
          account_name: c.account_name ?? null,
          gender,
          age,
          gender_age: genderAge,
          city: city.slice(0, 10),
          country: country.slice(0, 10),
        });
        covered.add(accId);
      }
    }

    // Meta OAuth fallback for accounts not covered (or with no Windsor data)
    try {
      const { fetchMetaGraphAudiences } = await import("./meta-graph.server");
      const extra = await fetchMetaGraphAudiences(reportId, covered);
      for (const a of extra) results.push(a);
    } catch {
      // ignore
    }

    return results;
  });
}


// ---------------- Search Console top pages / queries ----------------

export type SearchConsoleRow = {
  key: string;
  clicks: number;
  impressions: number;
  ctr: number; // 0..1
  position: number;
};

export type SearchConsoleTop = {
  account_id: string;
  account_name: string | null;
  pages: SearchConsoleRow[];
  queries: SearchConsoleRow[];
};

async function fetchSearchConsoleDimension(
  accountId: string,
  dimension: "page" | "query",
  range: WindsorRange,
): Promise<SearchConsoleRow[]> {
  try {
    const key = await windsorKey();
    const url = `${WINDSOR_BASE}/searchconsole?api_key=${key}&fields=account_id,${dimension},clicks,impressions,ctr,position&${rangeParams(range)}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = (await res.json()) as { data?: Array<Record<string, unknown>>; error?: string };
    if (json.error) return [];
    const wanted = String(accountId);
    const agg = new Map<string, { clicks: number; impressions: number; posSum: number; posN: number }>();
    for (const r of json.data ?? []) {
      if (String(r.account_id ?? "") !== wanted) continue;
      const k = r[dimension];
      if (k == null) continue;
      const label = String(k);
      if (dimension === "page") {
        try {
          const path = new URL(label).pathname.replace(/\/+$/, "");
          if (path === "") continue; // ignore homepage "/"
        } catch {
          if (label === "/" || label.replace(/\/+$/, "") === "") continue;
        }
      }

      const clicks = typeof r.clicks === "number" ? r.clicks : Number(r.clicks) || 0;
      const impressions = typeof r.impressions === "number" ? r.impressions : Number(r.impressions) || 0;
      const position = typeof r.position === "number" ? r.position : Number(r.position);
      const bucket = agg.get(label) ?? { clicks: 0, impressions: 0, posSum: 0, posN: 0 };
      bucket.clicks += clicks;
      bucket.impressions += impressions;
      if (Number.isFinite(position)) {
        bucket.posSum += position;
        bucket.posN += 1;
      }
      agg.set(label, bucket);
    }
    return Array.from(agg.entries())
      .map(([key, v]) => ({
        key,
        clicks: v.clicks,
        impressions: v.impressions,
        ctr: v.impressions > 0 ? v.clicks / v.impressions : 0,
        position: v.posN > 0 ? v.posSum / v.posN : 0,
      }))
      .sort((a, b) => b.impressions - a.impressions);
  } catch {
    return [];
  }
}

export async function getSearchConsoleTopImpl(
  callerId: string,
  reportId: string,
  range: WindsorRange = { datePreset: "last_30d" },
  limit = 10,
): Promise<SearchConsoleTop[]> {
  await assertReportAccess(callerId, reportId);
  return withCache(
    `sc-top-v2:${reportId}:${rangeKey(range)}:${limit}`,
    reportId,
    async () => {
      const { data: conns, error } = await supabaseAdmin
        .from("windsor_connections")
        .select("account_id, account_name")
        .eq("report_id", reportId)
        .eq("connector", "searchconsole");
      if (error) throw new Error(error.message);
      if (!conns || conns.length === 0) return [];

      const results: SearchConsoleTop[] = [];
      for (const c of conns) {
        const [pages, queries] = await Promise.all([
          fetchSearchConsoleDimension(String(c.account_id), "page", range),
          fetchSearchConsoleDimension(String(c.account_id), "query", range),
        ]);
        results.push({
          account_id: String(c.account_id),
          account_name: c.account_name ?? null,
          pages: pages.slice(0, limit),
          queries: queries.slice(0, limit),
        });
      }
      return results;
    },
    {
      // Windsor sometimes returns empty pages/queries for a range while the
      // connection is still warming up or transiently failing. Don't cache
      // those empty results so the next call retries against Windsor.
      skipWriteIf: (rows) =>
        rows.length === 0 ||
        rows.every((r) => (r.pages?.length ?? 0) === 0 && (r.queries?.length ?? 0) === 0),
    },
  );
}

// ---------------- Search Console YoY (same period year prior) ----------------

export type SearchConsoleYoY = {
  account_id: string;
  account_name: string | null;
  current: { clicks: number; impressions: number; ctr: number; position: number };
  previous: { clicks: number; impressions: number; ctr: number; position: number };
  rangeCurrent: { from: string; to: string };
  rangePrevious: { from: string; to: string };
};

function resolveConcreteRange(range: WindsorRange): { from: string; to: string } {
  if (range.dateFrom && range.dateTo) return { from: range.dateFrom, to: range.dateTo };
  const days = presetToDays(range.datePreset ?? "last_30d");
  const today = new Date();
  const to = today.toISOString().slice(0, 10);
  const fromD = new Date(today);
  fromD.setUTCDate(fromD.getUTCDate() - (days - 1));
  return { from: fromD.toISOString().slice(0, 10), to };
}

function shiftYear(iso: string, years: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCFullYear(d.getUTCFullYear() + years);
  return d.toISOString().slice(0, 10);
}

async function fetchSearchConsoleTotals(
  accountId: string,
  range: WindsorRange,
): Promise<{ clicks: number; impressions: number; ctr: number; position: number }> {
  // Use the same fetch + aggregation used by the top KPI tiles so numbers match.
  try {
    const rows = await fetchWindsor(
      "searchconsole",
      accountId,
      ["clicks", "impressions", "ctr", "position"],
      range,
      true,
    );
    const agg = aggregate(rows, ["clicks", "impressions", "ctr", "position"]);
    const clicks = Number(agg.clicks ?? 0);
    const impressions = Number(agg.impressions ?? 0);
    const position = Number(agg.position ?? 0);
    return {
      clicks,
      impressions,
      ctr: impressions > 0 ? clicks / impressions : 0,
      position,
    };
  } catch {
    return { clicks: 0, impressions: 0, ctr: 0, position: 0 };
  }
}

export async function getSearchConsoleYoYImpl(
  callerId: string,
  reportId: string,
  range: WindsorRange = { datePreset: "last_30d" },
): Promise<SearchConsoleYoY[]> {
  await assertReportAccess(callerId, reportId);
  return withCache(`sc-yoy-v2:${reportId}:${rangeKey(range)}`, reportId, async () => {
    const { data: conns, error } = await supabaseAdmin
      .from("windsor_connections")
      .select("account_id, account_name")
      .eq("report_id", reportId)
      .eq("connector", "searchconsole");
    if (error) throw new Error(error.message);
    if (!conns || conns.length === 0) return [];

    const current = resolveConcreteRange(range);
    const previous = {
      from: shiftYear(current.from, -1),
      to: shiftYear(current.to, -1),
    };
    const results: SearchConsoleYoY[] = [];
    for (const c of conns) {
      const [cur, prev] = await Promise.all([
        fetchSearchConsoleTotals(String(c.account_id), { dateFrom: current.from, dateTo: current.to }),
        fetchSearchConsoleTotals(String(c.account_id), { dateFrom: previous.from, dateTo: previous.to }),
      ]);
      results.push({
        account_id: String(c.account_id),
        account_name: c.account_name ?? null,
        current: cur,
        previous: prev,
        rangeCurrent: current,
        rangePrevious: previous,
      });
    }
    return results;
  });
}

// ---------------- Search Console monthly YTD ----------------

export type SearchConsoleMonthly = {
  account_id: string;
  account_name: string | null;
  year: number;
  months: Array<{ month: number; label: string; clicks: number; impressions: number }>;
};

const MONTH_LABELS_PT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function referenceYearMonth(range: WindsorRange): { year: number; month: number } {
  const ref = range.dateTo ?? resolveConcreteRange(range).to;
  const d = new Date(ref + "T00:00:00Z");
  const year = d.getUTCFullYear();
  const today = new Date();
  const isCurrentYear = year === today.getUTCFullYear();
  // Past/future full years show all 12 months; current year shows up to reference month.
  const month = isCurrentYear ? d.getUTCMonth() + 1 : 12;
  return { year, month };
}


export async function getSearchConsoleMonthlyYTDImpl(
  callerId: string,
  reportId: string,
  range: WindsorRange = { datePreset: "last_30d" },
): Promise<SearchConsoleMonthly[]> {
  await assertReportAccess(callerId, reportId);
  const { year, month } = referenceYearMonth(range);
  return withCache(`sc-monthly-v1:${reportId}:${year}-${month}`, reportId, async () => {
    const { data: conns, error } = await supabaseAdmin
      .from("windsor_connections")
      .select("account_id, account_name")
      .eq("report_id", reportId)
      .eq("connector", "searchconsole");
    if (error) throw new Error(error.message);
    if (!conns || conns.length === 0) return [];

    const from = `${year}-01-01`;
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const to = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    const results: SearchConsoleMonthly[] = [];
    for (const c of conns) {
      try {
        const rows = await fetchWindsor(
          "searchconsole",
          String(c.account_id),
          ["clicks", "impressions"],
          { dateFrom: from, dateTo: to },
          true,
        );
        const buckets = new Map<number, { clicks: number; impressions: number }>();
        for (let m = 1; m <= month; m++) buckets.set(m, { clicks: 0, impressions: 0 });
        for (const r of rows) {
          const date = String(r.date ?? "").slice(0, 10);
          if (!date) continue;
          const m = parseInt(date.slice(5, 7), 10);
          const b = buckets.get(m);
          if (!b) continue;
          if (typeof r.clicks === "number") b.clicks += r.clicks;
          if (typeof r.impressions === "number") b.impressions += r.impressions;
        }
        results.push({
          account_id: String(c.account_id),
          account_name: c.account_name ?? null,
          year,
          months: Array.from(buckets.entries())
            .sort(([a], [b]) => a - b)
            .map(([m, v]) => ({ month: m, label: MONTH_LABELS_PT[m - 1], clicks: v.clicks, impressions: v.impressions })),
        });
      } catch {
        results.push({
          account_id: String(c.account_id),
          account_name: c.account_name ?? null,
          year,
          months: [],
        });
      }
    }
    return results;
  });
}

// ---------------- Meta Ads creatives (per ad) ----------------

export type MetaAdCreative = {
  ad_id: string;
  ad_name: string;
  campaign_name: string | null;
  adset_name: string | null;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  frequency: number;
  leads: number;
  cpl: number;
  status: "healthy" | "fatigue" | "low-ctr" | "expensive" | "winning";
  statusReason: string;
};

const META_ADS_CREATIVE_FIELDS = [
  "account_id",
  "campaign_name",
  "adset_name",
  "ad_id",
  "ad_name",
  "spend",
  "impressions",
  "reach",
  "frequency",
  "clicks",
  "ctr",
  "cpc",
  "cpm",
  "actions_lead",
  "cost_per_action_type_lead",
];

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export async function getMetaAdsCreativesImpl(
  callerId: string,
  reportId: string,
  range: WindsorRange = { datePreset: "last_30d" },
  limit = 20,
): Promise<Array<{ account_id: string; account_name: string | null; creatives: MetaAdCreative[] }>> {
  await assertReportAccess(callerId, reportId);
  return withCache(`meta-creatives-v3:${reportId}:${rangeKey(range)}:${limit}`, reportId, async () => {
    const { data: conns, error } = await supabaseAdmin
      .from("windsor_connections")
      .select("account_id, account_name")
      .eq("report_id", reportId)
      .eq("connector", "facebook_ads");
    if (error) throw new Error(error.message);

    const results: Array<{ account_id: string; account_name: string | null; creatives: MetaAdCreative[] }> = [];
    const coveredAccounts = new Set<string>();

    if (conns && conns.length > 0) {
      const key = await windsorKey();
      const url = `${WINDSOR_BASE}/facebook?api_key=${key}&fields=${META_ADS_CREATIVE_FIELDS.join(",")}&${rangeParams(range)}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = (await res.json()) as { data?: Array<Record<string, unknown>>; error?: string };
        if (!json.error) {
          const allowed = new Set(conns.map((c) => String(c.account_id)));
          const byAcc = new Map<string, Map<string, MetaAdCreative>>();
          for (const r of json.data ?? []) {
            const acc = String(r.account_id ?? "");
            if (!allowed.has(acc)) continue;
            const adId = String(r.ad_id ?? "");
            const adName = String(r.ad_name ?? "").trim();
            if (!adId || !adName) continue;
            const map = byAcc.get(acc) ?? new Map<string, MetaAdCreative>();
            const cur = map.get(adId) ?? {
              ad_id: adId,
              ad_name: adName,
              campaign_name: (r.campaign_name as string) ?? null,
              adset_name: (r.adset_name as string) ?? null,
              spend: 0, impressions: 0, reach: 0, clicks: 0,
              ctr: 0, cpc: 0, cpm: 0, frequency: 0,
              leads: 0, cpl: 0,
              status: "healthy" as const, statusReason: "",
            };
            cur.spend += Number(r.spend) || 0;
            cur.impressions += Number(r.impressions) || 0;
            cur.reach += Number(r.reach) || 0;
            cur.clicks += Number(r.clicks) || 0;
            cur.leads += Number(r.actions_lead) || 0;
            const f = Number(r.frequency);
            if (Number.isFinite(f) && f > 0) cur.frequency = f;
            map.set(adId, cur);
            byAcc.set(acc, map);
          }

          for (const c of conns) {
            const accId = String(c.account_id);
            const list = Array.from(byAcc.get(accId)?.values() ?? []);
            for (const ad of list) {
              ad.ctr = ad.impressions > 0 ? (ad.clicks / ad.impressions) * 100 : 0;
              ad.cpc = ad.clicks > 0 ? ad.spend / ad.clicks : 0;
              ad.cpm = ad.impressions > 0 ? (ad.spend / ad.impressions) * 1000 : 0;
              ad.cpl = ad.leads > 0 ? ad.spend / ad.leads : 0;
              if (!ad.frequency && ad.reach > 0) ad.frequency = ad.impressions / ad.reach;
            }
            const ctrs = list.map((a) => a.ctr).filter((v) => v > 0);
            const cpcs = list.map((a) => a.cpc).filter((v) => v > 0);
            const medianCtr = median(ctrs);
            const medianCpc = median(cpcs);
            for (const ad of list) {
              if (ad.frequency >= 3.5) { ad.status = "fatigue"; ad.statusReason = `Frequência ${ad.frequency.toFixed(1)} — fadiga criativa, renovar.`; }
              else if (ad.ctr > 0 && ad.ctr < Math.max(0.8, medianCtr * 0.6)) { ad.status = "low-ctr"; ad.statusReason = `CTR ${ad.ctr.toFixed(2)}% abaixo do benchmark — criativo fraco.`; }
              else if (ad.cpc > 0 && medianCpc > 0 && ad.cpc > medianCpc * 1.6) { ad.status = "expensive"; ad.statusReason = `CPC R$ ${ad.cpc.toFixed(2)} acima do padrão da conta.`; }
              else if (ad.ctr >= Math.max(1.5, medianCtr * 1.3) && ad.frequency > 0 && ad.frequency < 3) { ad.status = "winning"; ad.statusReason = `CTR forte (${ad.ctr.toFixed(2)}%) e frequência saudável — escalar.`; }
              else { ad.status = "healthy"; ad.statusReason = "Performance dentro do padrão."; }
            }
            list.sort((a, b) => b.spend - a.spend);
            results.push({ account_id: accId, account_name: c.account_name ?? null, creatives: list.slice(0, limit) });
            coveredAccounts.add(accId);
          }
        }
      }
    }

    // Fallback / complement: native Meta OAuth (Graph API)
    try {
      const { fetchMetaGraphAdsCreatives } = await import("./meta-graph.server");
      const extra = await fetchMetaGraphAdsCreatives(reportId, range, coveredAccounts, limit);
      results.push(...extra);
    } catch {
      // ignore
    }

    return results;
  });
}

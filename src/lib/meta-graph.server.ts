import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type {
  DailyRow,
  MetaAdCreative,
  TopPost,
  WindsorMetricGroup,
  WindsorRange,
} from "./windsor.server";
import { buildInsights, computeDerived } from "./windsor.server";

const V = "v25.0";

type DiscoveredPage = {
  id: string;
  name: string;
  instagram: { id: string; username?: string; name?: string } | null;
};
type DiscoveredAd = { id: string; account_id: string; name?: string; currency?: string };
type Discovered = { pages?: DiscoveredPage[]; ad_accounts?: DiscoveredAd[] };

function isoDay(d: Date) {
  return d.toISOString().slice(0, 10);
}

function rangeToWindow(range: WindsorRange): { since: Date; until: Date; days: number } {
  let since: Date, until: Date;
  if (range.dateFrom && range.dateTo) {
    since = new Date(range.dateFrom + "T00:00:00Z");
    until = new Date(range.dateTo + "T00:00:00Z");
  } else {
    const preset = range.datePreset ?? "last_30d";
    const m = /^last_(\d+)d$/.exec(preset);
    const days = m ? parseInt(m[1], 10) : preset === "last_y" || preset === "last_year" ? 365 : 30;
    until = new Date();
    since = new Date(until.getTime() - (days - 1) * 86400000);
  }
  const days = Math.max(1, Math.round((until.getTime() - since.getTime()) / 86400000) + 1);
  return { since, until, days };
}

function previousWindow(range: WindsorRange): WindsorRange {
  const { since, until, days } = rangeToWindow(range);
  const prevUntil = new Date(since.getTime() - 86400000);
  const prevSince = new Date(prevUntil.getTime() - (days - 1) * 86400000);
  return { dateFrom: isoDay(prevSince), dateTo: isoDay(prevUntil) };
}

async function graphGet(url: string): Promise<Record<string, unknown>> {
  const res = await fetch(url);
  const json = (await res.json().catch(() => ({}))) as {
    error?: { message?: string };
  } & Record<string, unknown>;
  if (!res.ok || json.error) {
    throw new Error(json.error?.message ?? `Graph API ${res.status}`);
  }
  return json;
}

async function getPageTokens(userToken: string): Promise<Map<string, string>> {
  const json = (await graphGet(
    `https://graph.facebook.com/${V}/me/accounts?fields=id,access_token&limit=100&access_token=${encodeURIComponent(userToken)}`,
  )) as { data?: Array<{ id: string; access_token: string }> };
  const map = new Map<string, string>();
  for (const p of json.data ?? []) if (p.id && p.access_token) map.set(p.id, p.access_token);
  return map;
}

// ---- Facebook Page ----
async function fetchFacebookPage(
  pageId: string,
  pageToken: string,
  range: WindsorRange,
): Promise<{ metrics: Record<string, number | null>; daily: DailyRow[] }> {
  const { since, until } = rangeToWindow(range);
  const s = Math.floor(since.getTime() / 1000);
  const u = Math.floor(until.getTime() / 1000);
  // v25 válidas p/ Página: page_impressions_unique (reach), page_post_engagements,
  // page_fan_adds, page_fan_removes. page_impressions / page_views_total foram descontinuadas.
  const wanted: Array<{ metric: string; alias?: string }> = [
    { metric: "page_impressions_unique", alias: "page_reach" },
    { metric: "page_post_engagements" },
    { metric: "page_fan_adds" },
    { metric: "page_fan_removes" },
  ];

  const dailyMap = new Map<string, Record<string, number>>();
  const totals: Record<string, number> = {};

  // Chamadas individuais: se uma métrica for inválida na versão atual, ignora sem derrubar o resto.
  await Promise.all(
    wanted.map(async ({ metric, alias }) => {
      try {
        const json = (await graphGet(
          `https://graph.facebook.com/${V}/${pageId}/insights?metric=${metric}&period=day&since=${s}&until=${u}&access_token=${encodeURIComponent(pageToken)}`,
        )) as { data?: Array<{ values?: Array<{ end_time?: string; value?: number }> }> };
        const name = alias ?? metric;
        for (const m of json.data ?? []) {
          for (const v of m.values ?? []) {
            const date = String(v.end_time ?? "").slice(0, 10);
            const val = Number(v.value ?? 0);
            if (!date || !Number.isFinite(val)) continue;
            const b = dailyMap.get(date) ?? {};
            b[name] = (b[name] ?? 0) + val;
            dailyMap.set(date, b);
            totals[name] = (totals[name] ?? 0) + val;
          }
        }
      } catch {
        // métrica indisponível/deprecada nesta versão — pula
      }
    }),
  );
  try {
    const p = (await graphGet(
      `https://graph.facebook.com/${V}/${pageId}?fields=fan_count&access_token=${encodeURIComponent(pageToken)}`,
    )) as { fan_count?: number };
    if (typeof p.fan_count === "number") totals.page_fans = p.fan_count;
  } catch {
    // ignore
  }
  const daily: DailyRow[] = Array.from(dailyMap.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, vals]) => ({ date, ...vals }));
  return { metrics: totals, daily };
}

// ---- Instagram ----
async function fetchInstagram(
  igId: string,
  userToken: string,
  range: WindsorRange,
): Promise<{ metrics: Record<string, number | null>; daily: DailyRow[] }> {
  const { since, until } = rangeToWindow(range);
  const s = Math.floor(since.getTime() / 1000);
  const u = Math.floor(until.getTime() / 1000);
  const totals: Record<string, number> = {};
  const dailyMap = new Map<string, Record<string, number>>();
  // v22+: `impressions`/`profile_views` descontinuadas. Usar `views` e `accounts_engaged`
  // como métricas de total (metric_type=total_value, sem série diária).
  // `reach` continua aceitando period=day como time_series.
  try {
    const json = (await graphGet(
      `https://graph.facebook.com/${V}/${igId}/insights?metric=reach&period=day&since=${s}&until=${u}&access_token=${encodeURIComponent(userToken)}`,
    )) as {
      data?: Array<{ name: string; values?: Array<{ end_time?: string; value?: number }> }>;
    };
    for (const m of json.data ?? []) {
      for (const v of m.values ?? []) {
        const date = String(v.end_time ?? "").slice(0, 10);
        const val = Number(v.value ?? 0);
        if (!date || !Number.isFinite(val)) continue;
        const b = dailyMap.get(date) ?? {};
        b[m.name] = (b[m.name] ?? 0) + val;
        dailyMap.set(date, b);
        totals[m.name] = (totals[m.name] ?? 0) + val;
      }
    }
  } catch {
    // ignore
  }
  // Totais (metric_type=total_value) — cada métrica isolada porque a permissão varia.
  // A API de Insights do Instagram aceita no máximo 30 dias por requisição, então
  // quebramos o período em janelas de 30 dias e somamos os totais.
  const windows: Array<{ s: number; u: number }> = [];
  {
    const MAX = 30 * 86400;
    let cursor = s;
    while (cursor < u) {
      const end = Math.min(cursor + MAX, u);
      windows.push({ s: cursor, u: end });
      cursor = end;
    }
    if (windows.length === 0) windows.push({ s, u });
  }
  const metricErrors: Record<string, string> = {};
  // `views` (e as demais métricas de conta v22+) exigem `period=day` junto de
  // `metric_type=total_value`; sem o período a API devolve erro e a métrica some.
  await Promise.all(
    [
      "views",
      "accounts_engaged",
      "profile_views",
      "website_clicks",
      "total_interactions",
      "likes",
      "comments",
      "saves",
      "shares",
      "replies",
    ].map(async (metric) => {
      let sum = 0;
      let got = false;
      for (const w of windows) {
        try {
          const json = (await graphGet(
            `https://graph.facebook.com/${V}/${igId}/insights?metric=${metric}&period=day&metric_type=total_value&since=${w.s}&until=${w.u}&access_token=${encodeURIComponent(userToken)}`,
          )) as {
            data?: Array<{ name: string; total_value?: { value?: number } }>;
          };
          for (const m of json.data ?? []) {
            const val = Number(m.total_value?.value ?? 0);
            if (Number.isFinite(val)) {
              sum += val;
              got = true;
            }
          }
        } catch (e) {
          metricErrors[metric] = (e as Error).message;
        }
      }
      if (got) totals[metric] = sum;
    }),
  );


  // Série diária de `views` (e fallback do total caso total_value falhe).
  try {
    let viewsSum = 0;
    let gotViews = false;
    for (const w of windows) {
      const json = (await graphGet(
        `https://graph.facebook.com/${V}/${igId}/insights?metric=views&period=day&since=${w.s}&until=${w.u}&access_token=${encodeURIComponent(userToken)}`,
      )) as {
        data?: Array<{ name: string; values?: Array<{ end_time?: string; value?: number }> }>;
      };
      for (const m of json.data ?? []) {
        for (const v of m.values ?? []) {
          const date = String(v.end_time ?? "").slice(0, 10);
          const val = Number(v.value ?? 0);
          if (!date || !Number.isFinite(val)) continue;
          const b = dailyMap.get(date) ?? {};
          b.views = (b.views ?? 0) + val;
          dailyMap.set(date, b);
          viewsSum += val;
          gotViews = true;
        }
      }
    }
    if (gotViews && !totals.views) totals.views = viewsSum;
  } catch (e) {
    if (!totals.views) metricErrors.views_daily = (e as Error).message;
  }


  try {
    const info = (await graphGet(
      `https://graph.facebook.com/${V}/${igId}?fields=followers_count,follows_count,media_count&access_token=${encodeURIComponent(userToken)}`,
    )) as { followers_count?: number; follows_count?: number; media_count?: number };
    if (typeof info.followers_count === "number") totals.followers_count = info.followers_count;
    if (typeof info.follows_count === "number") totals.follows_count = info.follows_count;
    if (typeof info.media_count === "number") totals.media_count = info.media_count;
  } catch {
    // ignore
  }

  // Aggregate engagement from media posted within the window (likes/comments/saves/shares/interactions)
  try {
    const posts = await fetchInstagramMediaInWindow(igId, userToken, range);
    let likes = 0, comments = 0, saved = 0, shares = 0, total_interactions = 0, postViews = 0;
    for (const p of posts) {
      likes += p.likes;
      comments += p.comments;
      saved += p.saved;
      shares += p.shares;
      postViews += p.views;
      total_interactions += p.engagement || p.likes + p.comments + p.saved + p.shares;
    }
    if (posts.length > 0) {
      // Só sobrescreve se o total_value não retornou nada para aquela métrica.
      if (!totals.likes) totals.likes = likes;
      if (!totals.comments) totals.comments = comments;
      if (!totals.saves) totals.saves = saved;
      if (!totals.shares) totals.shares = shares;
      if (!totals.total_interactions) totals.total_interactions = total_interactions;
      // Último recurso: soma das visualizações dos posts do período.
      if (!totals.views && postViews > 0) {
        totals.views = postViews;
        totals.views_source_posts = 1;
      }
    }

  } catch {
    // ignore
  }

  const daily: DailyRow[] = Array.from(dailyMap.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, vals]) => ({ date, ...vals }));
  return { metrics: totals, daily };
}

// ---- Instagram media (top posts) ----
async function fetchInstagramMediaInWindow(
  igId: string,
  userToken: string,
  range: WindsorRange,
  igUsername?: string,
): Promise<Array<TopPost & { connector: string }>> {
  const { since, until } = rangeToWindow(range);
  const sinceMs = since.getTime();
  const untilMs = until.getTime() + 86400000 - 1;

  const fields = [
    "id",
    "caption",
    "media_type",
    "media_url",
    "thumbnail_url",
    "permalink",
    "timestamp",
    "like_count",
    "comments_count",
  ].join(",");
  let url: string | null =
    `https://graph.facebook.com/${V}/${igId}/media?fields=${fields}&limit=50&access_token=${encodeURIComponent(userToken)}`;

  const raw: Array<Record<string, unknown>> = [];
  let pages = 0;
  while (url && pages < 6) {
    const j = (await graphGet(url)) as {
      data?: Array<Record<string, unknown>>;
      paging?: { next?: string };
    };
    for (const m of j.data ?? []) raw.push(m);
    // stop early if oldest item is before window
    const last = raw[raw.length - 1];
    const lastTs = last?.timestamp ? new Date(String(last.timestamp)).getTime() : 0;
    if (lastTs && lastTs < sinceMs) break;
    url = j.paging?.next ?? null;
    pages++;
  }

  const inWindow = raw.filter((m) => {
    const t = m.timestamp ? new Date(String(m.timestamp)).getTime() : 0;
    return t >= sinceMs && t <= untilMs;
  });

  const results: Array<TopPost & { connector: string }> = [];
  await Promise.all(
    inWindow.map(async (m) => {
      const mediaId = String(m.id ?? "");
      if (!mediaId) return;
      const mediaType = String(m.media_type ?? "").toUpperCase();
      const insightMetrics =
        mediaType === "VIDEO" || mediaType === "REELS"
          ? "reach,saved,shares,total_interactions,views"
          : "reach,saved,shares,total_interactions";
      let reach = 0, saved = 0, shares = 0, interactions = 0, views = 0;
      try {
        const ij = (await graphGet(
          `https://graph.facebook.com/${V}/${mediaId}/insights?metric=${insightMetrics}&access_token=${encodeURIComponent(userToken)}`,
        )) as { data?: Array<{ name: string; values?: Array<{ value?: number }> }> };
        for (const it of ij.data ?? []) {
          const v = Number(it.values?.[0]?.value ?? 0);
          if (!Number.isFinite(v)) continue;
          if (it.name === "reach") reach = v;
          else if (it.name === "saved") saved = v;
          else if (it.name === "shares") shares = v;
          else if (it.name === "total_interactions") interactions = v;
          else if (it.name === "views") views = v;
        }
      } catch {
        // some media (e.g. old ones) may not expose insights
      }
      const likes = Number(m.like_count ?? 0) || 0;
      const comments = Number(m.comments_count ?? 0) || 0;
      results.push({
        connector: "instagram",
        media_id: mediaId,
        account_id: igId,
        account_name: igUsername ? `@${igUsername}` : null,
        media_type: (m.media_type as string) ?? null,
        caption: (m.caption as string) ?? null,
        permalink: (m.permalink as string) ?? null,
        thumbnail: ((m.thumbnail_url as string) || (m.media_url as string)) ?? null,
        timestamp: (m.timestamp as string) ?? null,
        likes,
        comments,
        shares,
        saved,
        reach,
        views,
        engagement: interactions || likes + comments + saved + shares,
      });
    }),
  );
  return results;
}

// ---- Meta Ads ----
async function fetchAdInsights(
  actId: string,
  userToken: string,
  range: WindsorRange,
): Promise<{ metrics: Record<string, number | null>; daily: DailyRow[] }> {
  const { since, until } = rangeToWindow(range);
  const timeRange = encodeURIComponent(
    JSON.stringify({ since: isoDay(since), until: isoDay(until) }),
  );
  const scalarFields = ["spend", "impressions", "reach", "frequency", "clicks", "ctr", "cpc", "cpm"];
  const fieldStr = [...scalarFields, "actions", "cost_per_action_type"].join(",");
  const base = `https://graph.facebook.com/${V}/${actId}/insights?fields=${fieldStr}&time_range=${timeRange}&level=account&access_token=${encodeURIComponent(userToken)}`;

  const LEAD_TYPES = new Set([
    "lead",
    "onsite_conversion.lead_grouped",
    "offsite_conversion.fb_pixel_lead",
  ]);
  const extractLead = (row: Record<string, unknown>): { leads: number; cpl: number | null } => {
    let leads = 0;
    const actions = Array.isArray(row.actions) ? (row.actions as Array<Record<string, unknown>>) : [];
    for (const a of actions) {
      if (LEAD_TYPES.has(String(a.action_type ?? ""))) leads += Number(a.value) || 0;
    }
    let cpl: number | null = null;
    const cpa = Array.isArray(row.cost_per_action_type)
      ? (row.cost_per_action_type as Array<Record<string, unknown>>)
      : [];
    for (const a of cpa) {
      if (LEAD_TYPES.has(String(a.action_type ?? ""))) {
        const v = Number(a.value);
        if (Number.isFinite(v) && v > 0) { cpl = v; break; }
      }
    }
    return { leads, cpl };
  };

  const daily: DailyRow[] = [];
  try {
    const dj = (await graphGet(`${base}&time_increment=1`)) as {
      data?: Array<Record<string, unknown>>;
    };
    for (const r of dj.data ?? []) {
      const date = String(r.date_start ?? "").slice(0, 10);
      if (!date) continue;
      const row: DailyRow = { date };
      for (const f of scalarFields) {
        const n = Number(r[f]);
        if (Number.isFinite(n)) row[f] = n;
      }
      const { leads, cpl } = extractLead(r);
      if (leads > 0) row.actions_lead = leads;
      if (cpl != null) row.cost_per_action_type_lead = cpl;
      daily.push(row);
    }
  } catch {
    // ignore
  }

  const totals: Record<string, number> = {};
  try {
    const aj = (await graphGet(base)) as { data?: Array<Record<string, unknown>> };
    const first = (aj.data ?? [])[0] ?? {};
    for (const f of scalarFields) {
      const n = Number(first[f]);
      if (Number.isFinite(n)) totals[f] = n;
    }
    const { leads, cpl } = extractLead(first);
    if (leads > 0) totals.actions_lead = leads;
    if (cpl != null) totals.cost_per_action_type_lead = cpl;
    else if (leads > 0 && totals.spend) totals.cost_per_action_type_lead = totals.spend / leads;
  } catch {
    // ignore
  }
  return { metrics: totals, daily };
}

type ConnectionRow = {
  id: string;
  report_id: string;
  access_token: string;
  discovered_pages: Discovered | null;
  // ids explicitly enabled via selected_assets; null means "all allowed" (legacy).
  allowFbPages: Set<string> | null;
  allowIgAccounts: Set<string> | null;
  allowAdAccounts: Set<string> | null;
};

type SelectedAssets = {
  pages?: string[];
  instagrams?: string[];
  ad_accounts?: string[];
};

async function loadMetaConnections(reportId: string): Promise<ConnectionRow[]> {
  const { data, error } = await supabaseAdmin
    .from("meta_connections")
    .select("id, report_id, access_token, discovered_pages, selected_assets, token_expires_at")
    .eq("report_id", reportId);
  if (error) throw new Error(error.message);
  const now = Date.now();
  const liveRows = (data ?? [])
    .filter((r) => !r.token_expires_at || new Date(r.token_expires_at).getTime() > now)
    .map((r) => r as unknown as {
      id: string;
      report_id: string;
      access_token: string;
      discovered_pages: Discovered | null;
      selected_assets: SelectedAssets | null;
      token_expires_at: string | null;
    });

  const { refreshMetaConnectionAssetsIfEmpty } = await import("./meta.server");
  const refreshedRows = await Promise.all(
    liveRows.map(async (row) => {
      try {
        return await refreshMetaConnectionAssetsIfEmpty(row as never) as typeof row;
      } catch {
        return row;
      }
    }),
  );

  return refreshedRows.map((r) => {
      const sel = (r.selected_assets as SelectedAssets | null) ?? null;
      return {
        id: r.id,
        report_id: r.report_id,
        access_token: r.access_token as string,
        discovered_pages: (r.discovered_pages as Discovered | null) ?? null,
        allowFbPages: sel ? new Set(sel.pages ?? []) : null,
        allowIgAccounts: sel ? new Set(sel.instagrams ?? []) : null,
        allowAdAccounts: sel ? new Set(sel.ad_accounts ?? []) : null,
      };
    });
}



function makeGroup(
  connector: string,
  account_id: string,
  account_name: string | null,
  cur: { metrics: Record<string, number | null>; daily: DailyRow[] },
  prev: { metrics: Record<string, number | null> },
  error?: string,
): WindsorMetricGroup {
  const derived = computeDerived(connector, cur.metrics);
  const derivedPrevious = computeDerived(connector, prev.metrics);
  const insights = buildInsights(connector, cur.metrics, prev.metrics, derived);
  return {
    connector,
    account_id,
    account_name,
    metrics: cur.metrics,
    previous: prev.metrics,
    derived,
    derivedPrevious,
    insights,
    daily: cur.daily,
    ...(error ? { error } : {}),
  };
}

/**
 * Fetches Graph API-backed metrics for pages/ig/ad_accounts discovered via
 * the native Meta OAuth connection, skipping pairs already covered by Windsor.
 */
export async function fetchMetaGraphGroups(
  reportId: string,
  range: WindsorRange,
  covered: Set<string>, // "connector::account_id" already handled by Windsor
): Promise<WindsorMetricGroup[]> {
  const conns = await loadMetaConnections(reportId);
  if (conns.length === 0) return [];

  const prev = previousWindow(range);
  const groups: WindsorMetricGroup[] = [];

  for (const conn of conns) {
    const disc = conn.discovered_pages ?? {};
    const pageTokens = await getPageTokens(conn.access_token).catch(
      () => new Map<string, string>(),
    );

    for (const page of disc.pages ?? []) {
      // Facebook page
      const fbKey = `facebook::${page.id}`;
      const fbAllowed = conn.allowFbPages === null || conn.allowFbPages.has(page.id);
      if (fbAllowed && !covered.has(fbKey)) {

        const token = pageTokens.get(page.id) ?? conn.access_token;
        try {
          const [cur, previous] = await Promise.all([
            fetchFacebookPage(page.id, token, range),
            fetchFacebookPage(page.id, token, prev).catch(() => ({ metrics: {}, daily: [] })),
          ]);
          groups.push(makeGroup("facebook", page.id, page.name, cur, previous));
          covered.add(fbKey);
        } catch (e) {
          groups.push(
            makeGroup(
              "facebook",
              page.id,
              page.name,
              { metrics: {}, daily: [] },
              { metrics: {} },
              (e as Error).message,
            ),
          );
        }
      }
      // Instagram
      if (page.instagram) {
        const igId = page.instagram.id;
        const igKey = `instagram::${igId}`;
        const igAllowed = conn.allowIgAccounts === null || conn.allowIgAccounts.has(igId);
        if (igAllowed && !covered.has(igKey)) {

          try {
            const [cur, previous] = await Promise.all([
              fetchInstagram(igId, conn.access_token, range),
              fetchInstagram(igId, conn.access_token, prev).catch(() => ({
                metrics: {},
                daily: [],
              })),
            ]);
            const label =
              page.instagram.username ?? page.instagram.name ?? page.instagram.id;
            groups.push(makeGroup("instagram", igId, `@${label}`, cur, previous));
            covered.add(igKey);
          } catch (e) {
            groups.push(
              makeGroup(
                "instagram",
                igId,
                page.instagram.username ?? igId,
                { metrics: {}, daily: [] },
                { metrics: {} },
                (e as Error).message,
              ),
            );
          }
        }
      }
    }

    for (const ad of disc.ad_accounts ?? []) {
      if (conn.allowAdAccounts !== null && !conn.allowAdAccounts.has(ad.account_id)) continue;
      const key = `facebook_ads::${ad.account_id}`;
      if (covered.has(key)) continue;

      const actId = ad.id.startsWith("act_") ? ad.id : `act_${ad.account_id}`;
      try {
        const [cur, previous] = await Promise.all([
          fetchAdInsights(actId, conn.access_token, range),
          fetchAdInsights(actId, conn.access_token, prev).catch(() => ({
            metrics: {},
            daily: [],
          })),
        ]);
        groups.push(
          makeGroup("facebook_ads", ad.account_id, ad.name ?? ad.account_id, cur, previous),
        );
        covered.add(key);
      } catch (e) {
        groups.push(
          makeGroup(
            "facebook_ads",
            ad.account_id,
            ad.name ?? ad.account_id,
            { metrics: {}, daily: [] },
            { metrics: {} },
            (e as Error).message,
          ),
        );
      }
    }
  }

  return groups;
}

// ---- Meta Ads creatives (ad-level insights) ----
async function fetchAdCreatives(
  actId: string,
  userToken: string,
  range: WindsorRange,
): Promise<MetaAdCreative[]> {
  const { since, until } = rangeToWindow(range);
  const timeRange = encodeURIComponent(
    JSON.stringify({ since: isoDay(since), until: isoDay(until) }),
  );
  const fields = [
    "ad_id",
    "ad_name",
    "campaign_name",
    "adset_name",
    "spend",
    "impressions",
    "reach",
    "frequency",
    "clicks",
    "ctr",
    "cpc",
    "cpm",
    "actions",
    "cost_per_action_type",
  ].join(",");

  const LEAD_TYPES = new Set([
    "lead",
    "onsite_conversion.lead_grouped",
    "offsite_conversion.fb_pixel_lead",
  ]);

  const rows: Array<Record<string, unknown>> = [];
  let url: string | null =
    `https://graph.facebook.com/${V}/${actId}/insights?fields=${fields}&time_range=${timeRange}&level=ad&limit=200&access_token=${encodeURIComponent(userToken)}`;
  let pages = 0;
  while (url && pages < 5) {
    const j = (await graphGet(url)) as {
      data?: Array<Record<string, unknown>>;
      paging?: { next?: string };
    };
    for (const r of j.data ?? []) rows.push(r);
    url = j.paging?.next ?? null;
    pages++;
  }

  const list: MetaAdCreative[] = [];
  for (const r of rows) {
    const adId = String(r.ad_id ?? "");
    const adName = String(r.ad_name ?? "").trim();
    if (!adId || !adName) continue;
    const impressions = Number(r.impressions) || 0;
    const clicks = Number(r.clicks) || 0;
    const spend = Number(r.spend) || 0;
    const reach = Number(r.reach) || 0;
    const frequency = Number(r.frequency) || (reach > 0 ? impressions / reach : 0);
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    const cpc = clicks > 0 ? spend / clicks : 0;
    const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;
    let leads = 0;
    const actions = Array.isArray(r.actions) ? (r.actions as Array<Record<string, unknown>>) : [];
    for (const a of actions) {
      if (LEAD_TYPES.has(String(a.action_type ?? ""))) leads += Number(a.value) || 0;
    }
    let cpl = 0;
    const cpa = Array.isArray(r.cost_per_action_type)
      ? (r.cost_per_action_type as Array<Record<string, unknown>>)
      : [];
    for (const a of cpa) {
      if (LEAD_TYPES.has(String(a.action_type ?? ""))) {
        const v = Number(a.value);
        if (Number.isFinite(v) && v > 0) { cpl = v; break; }
      }
    }
    if (!cpl && leads > 0 && spend > 0) cpl = spend / leads;
    list.push({
      ad_id: adId,
      ad_name: adName,
      campaign_name: (r.campaign_name as string) ?? null,
      adset_name: (r.adset_name as string) ?? null,
      spend,
      impressions,
      reach,
      clicks,
      ctr,
      cpc,
      cpm,
      frequency,
      leads,
      cpl,
      status: "healthy",
      statusReason: "",
    });
  }

  const nums = (xs: number[]) => xs.filter((v) => v > 0).sort((a, b) => a - b);
  const med = (xs: number[]) => {
    const s = nums(xs);
    if (s.length === 0) return 0;
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };
  const medianCtr = med(list.map((a) => a.ctr));
  const medianCpc = med(list.map((a) => a.cpc));
  for (const ad of list) {
    if (ad.frequency >= 3.5) {
      ad.status = "fatigue";
      ad.statusReason = `Frequência ${ad.frequency.toFixed(1)} — fadiga criativa, renovar.`;
    } else if (ad.ctr > 0 && ad.ctr < Math.max(0.8, medianCtr * 0.6)) {
      ad.status = "low-ctr";
      ad.statusReason = `CTR ${ad.ctr.toFixed(2)}% abaixo do benchmark — criativo fraco.`;
    } else if (ad.cpc > 0 && medianCpc > 0 && ad.cpc > medianCpc * 1.6) {
      ad.status = "expensive";
      ad.statusReason = `CPC R$ ${ad.cpc.toFixed(2)} acima do padrão da conta.`;
    } else if (ad.ctr >= Math.max(1.5, medianCtr * 1.3) && ad.frequency > 0 && ad.frequency < 3) {
      ad.status = "winning";
      ad.statusReason = `CTR forte (${ad.ctr.toFixed(2)}%) e frequência saudável — escalar.`;
    } else {
      ad.status = "healthy";
      ad.statusReason = "Performance dentro do padrão.";
    }
  }
  list.sort((a, b) => b.spend - a.spend);
  return list;
}

/**
 * Top Instagram posts for accounts covered by the native Meta OAuth connection.
 * `covered` is a set of account_ids already returned by Windsor — those are skipped.
 */
export async function fetchMetaGraphTopPosts(
  reportId: string,
  range: WindsorRange,
  covered: Set<string>,
  limit: number,
  sortBy: "engagement" | "reach" | "likes" | "views",
): Promise<Array<TopPost & { connector: string }>> {
  const conns = await loadMetaConnections(reportId);
  if (conns.length === 0) return [];
  const out: Array<TopPost & { connector: string }> = [];
  for (const conn of conns) {
    for (const page of conn.discovered_pages?.pages ?? []) {
      const ig = page.instagram;
      if (!ig) continue;
      if (conn.allowIgAccounts !== null && !conn.allowIgAccounts.has(ig.id)) continue;
      if (covered.has(ig.id)) continue;

      try {
        const posts = await fetchInstagramMediaInWindow(
          ig.id,
          conn.access_token,
          range,
          ig.username ?? ig.name,
        );
        out.push(...posts);
        covered.add(ig.id);
      } catch {
        // ignore
      }
    }
  }
  out.sort((a, b) => (b[sortBy] || 0) - (a[sortBy] || 0));
  return out.slice(0, limit);
}

/**
 * Ad-level creatives from ad accounts covered by the native Meta OAuth connection.
 */
export async function fetchMetaGraphAdsCreatives(
  reportId: string,
  range: WindsorRange,
  covered: Set<string>,
  limit: number,
): Promise<Array<{ account_id: string; account_name: string | null; creatives: MetaAdCreative[] }>> {
  const conns = await loadMetaConnections(reportId);
  if (conns.length === 0) return [];
  const out: Array<{ account_id: string; account_name: string | null; creatives: MetaAdCreative[] }> = [];
  for (const conn of conns) {
    for (const ad of conn.discovered_pages?.ad_accounts ?? []) {
      if (conn.allowAdAccounts !== null && !conn.allowAdAccounts.has(ad.account_id)) continue;
      if (covered.has(ad.account_id)) continue;

      const actId = ad.id.startsWith("act_") ? ad.id : `act_${ad.account_id}`;
      try {
        const creatives = await fetchAdCreatives(actId, conn.access_token, range);
        out.push({
          account_id: ad.account_id,
          account_name: ad.name ?? ad.account_id,
          creatives: creatives.slice(0, limit),
        });
        covered.add(ad.account_id);
      } catch {
        // ignore
      }
    }
  }
  return out;
}

// ---- Instagram audience demographics (follower_demographics) ----
export type GraphAudience = {
  account_id: string;
  account_name: string | null;
  gender: Array<{ label: string; value: number }>;
  age: Array<{ label: string; value: number }>;
  gender_age: Array<{ label: string; value: number }>;
  city: Array<{ label: string; value: number }>;
  country: Array<{ label: string; value: number }>;
};

async function fetchFollowerBreakdown(
  igId: string,
  token: string,
  breakdown: "age" | "gender" | "country" | "city",
): Promise<Array<{ label: string; value: number }>> {
  try {
    const url =
      `https://graph.facebook.com/${V}/${igId}/insights` +
      `?metric=follower_demographics&period=lifetime&metric_type=total_value` +
      `&breakdown=${breakdown}&access_token=${encodeURIComponent(token)}`;
    const j = (await graphGet(url)) as {
      data?: Array<{ total_value?: { breakdowns?: Array<{ results?: Array<{ dimension_values?: string[]; value?: number }> }> } }>;
    };
    const results = j.data?.[0]?.total_value?.breakdowns?.[0]?.results ?? [];
    return results
      .map((r) => ({
        label: (r.dimension_values ?? []).join(" · "),
        value: Number(r.value) || 0,
      }))
      .filter((r) => r.label && r.value > 0)
      .sort((a, b) => b.value - a.value);
  } catch {
    return [];
  }
}

export async function fetchMetaGraphAudiences(
  reportId: string,
  covered: Set<string>,
): Promise<GraphAudience[]> {
  const conns = await loadMetaConnections(reportId);
  if (conns.length === 0) return [];
  const out: GraphAudience[] = [];
  for (const conn of conns) {
    for (const page of conn.discovered_pages?.pages ?? []) {
      const ig = page.instagram;
      if (!ig) continue;
      if (conn.allowIgAccounts !== null && !conn.allowIgAccounts.has(ig.id)) continue;
      if (covered.has(ig.id)) continue;

      const [age, gender, country, city] = await Promise.all([
        fetchFollowerBreakdown(ig.id, conn.access_token, "age"),
        fetchFollowerBreakdown(ig.id, conn.access_token, "gender"),
        fetchFollowerBreakdown(ig.id, conn.access_token, "country"),
        fetchFollowerBreakdown(ig.id, conn.access_token, "city"),
      ]);
      out.push({
        account_id: ig.id,
        account_name: `@${ig.username ?? ig.name ?? ig.id}`,
        gender,
        age,
        gender_age: [],
        city: city.slice(0, 10),
        country: country.slice(0, 10),
      });
      covered.add(ig.id);
    }
  }
  return out;
}


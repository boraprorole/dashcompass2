import { supabaseAdmin } from "@/integrations/supabase/client.server";

// TikTok Login Kit (v2) — fluxo orgânico
const AUTH_URL = "https://www.tiktok.com/v2/auth/authorize/";
const TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
const USER_INFO_URL = "https://open.tiktokapis.com/v2/user/info/";
const VIDEO_LIST_URL = "https://open.tiktokapis.com/v2/video/list/";
const TIKTOK_REDIRECT_URI = "https://dashcompass.com/auth/tiktok/callback";
const SCOPES = "user.info.basic,user.info.stats,video.list";

export type TiktokRange = { datePreset?: string; dateFrom?: string; dateTo?: string };

export type TiktokMetricGroup = {
  connector: "tiktok_oauth";
  account_id: string;
  account_name: string | null;
  metrics: Record<string, number | null>;
  previous: Record<string, number | null>;
  derived: Record<string, number | null>;
  derivedPrevious: Record<string, number | null>;
  insights: Array<{ level: "success" | "warning" | "danger" | "info"; title: string; detail: string; metric?: string }>;
  daily: Array<{ date: string } & Record<string, number | string | null>>;
  error?: string;
};

export async function assertTiktokReportAccess(callerId: string, reportId: string) {
  const { data: adminRoles, error: adminError } = await supabaseAdmin
    .from("user_roles")
    .select("role, agency_id")
    .eq("user_id", callerId)
    .in("role", ["admin", "admin_global", "admin_agencia"]);

  if (adminError) throw new Error(adminError.message);

  const isGlobalAdmin = (adminRoles ?? []).some((role) => role.role === "admin" || role.role === "admin_global");
  if (isGlobalAdmin) return;

  const { data: report, error: reportError } = await supabaseAdmin
    .from("reports")
    .select("company_id, agency_id")
    .eq("id", reportId)
    .maybeSingle();

  if (reportError) throw new Error(reportError.message);
  if (!report) throw new Error("Report not found");

  const agencyIds = new Set((adminRoles ?? []).map((role) => role.agency_id).filter(Boolean));
  if (report.agency_id && agencyIds.has(report.agency_id)) return;

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("company_id")
    .eq("id", callerId)
    .maybeSingle();

  if (profileError) throw new Error(profileError.message);
  if (!profile || profile.company_id !== report.company_id) throw new Error("Forbidden");
}

type TiktokConfig = { clientKey: string; clientSecret: string };

function getTiktokConfig(): TiktokConfig {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  if (!clientKey) throw new Error("TIKTOK_CLIENT_KEY não configurado");
  if (!clientSecret) throw new Error("TIKTOK_CLIENT_SECRET não configurado");
  return { clientKey, clientSecret };
}

export async function buildTiktokAuthUrl(opts: { reportId: string; userId: string }) {
  const { clientKey } = getTiktokConfig();
  const state = btoa(JSON.stringify({ reportId: opts.reportId, userId: opts.userId }));
  const params = new URLSearchParams({
    client_key: clientKey,
    response_type: "code",
    scope: SCOPES,
    redirect_uri: TIKTOK_REDIRECT_URI,
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  open_id?: string;
  scope?: string;
  expires_in?: number;
  refresh_expires_in?: number;
  error?: string;
  error_description?: string;
};

type TiktokTokenSet = {
  access_token: string;
  refresh_token: string;
  open_id?: string;
  scope?: string;
  expires_in?: number;
  refresh_expires_in?: number;
};

type TiktokApiError = Error & { status?: number; code?: string; logId?: string };

type TiktokApiEnvelope<T> = {
  data?: T;
  error?: {
    code?: string;
    message?: string;
    log_id?: string;
  };
};

type TiktokUserInfo = {
  open_id?: string;
  display_name?: string;
  avatar_url?: string;
  follower_count?: number;
  following_count?: number;
  likes_count?: number;
  video_count?: number;
};

type TiktokVideo = {
  id?: string;
  create_time?: number;
  title?: string;
  video_description?: string;
  view_count?: number;
  like_count?: number;
  comment_count?: number;
  share_count?: number;
};

type VideoListData = {
  videos?: TiktokVideo[];
  cursor?: number;
  has_more?: boolean;
};

function requireTokenSet(data: TokenResponse): TiktokTokenSet {
  if (!data.access_token || !data.refresh_token) {
    throw new Error(`Erro TikTok Token: ${data.error_description || data.error || JSON.stringify(data)}`);
  }

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    open_id: data.open_id,
    scope: data.scope,
    expires_in: data.expires_in,
    refresh_expires_in: data.refresh_expires_in,
  };
}

function buildTiktokApiError(status: number, fallback: string, payload: TiktokApiEnvelope<unknown>): TiktokApiError {
  const code = payload.error?.code;
  const message = payload.error?.message;
  const logId = payload.error?.log_id;
  const details = [code, message, logId ? `Log ID: ${logId}` : null].filter(Boolean).join(" · ");
  const error = new Error(details || fallback) as TiktokApiError;
  error.status = status;
  error.code = code;
  error.logId = logId;
  return error;
}

async function readTiktokJson<T>(response: Response, fallback: string): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as TiktokApiEnvelope<T>;
  const code = payload.error?.code;
  if (!response.ok || (code && code !== "ok")) {
    throw buildTiktokApiError(response.status, fallback, payload);
  }

  if (!payload.data) {
    throw new Error(fallback);
  }

  return payload.data;
}

function isRefreshableAuthError(error: unknown): boolean {
  const tiktokError = error as TiktokApiError;
  const code = tiktokError.code?.toLowerCase() ?? "";
  const message = tiktokError.message.toLowerCase();
  return (
    tiktokError.status === 401 ||
    code.includes("access_token") ||
    message.includes("access token") ||
    message.includes("expired")
  );
}

function isMissingScopeError(error: unknown): boolean {
  const tiktokError = error as TiktokApiError;
  const code = tiktokError.code?.toLowerCase() ?? "";
  const message = tiktokError.message.toLowerCase();
  return code.includes("scope") || message.includes("scope") || message.includes("permission");
}

export async function exchangeTiktokCode(code: string): Promise<TiktokTokenSet> {
  const { clientKey, clientSecret } = getTiktokConfig();
  const body = new URLSearchParams({
    client_key: clientKey,
    client_secret: clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: TIKTOK_REDIRECT_URI,
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "Cache-Control": "no-cache" },
    body,
  });
  const data = (await res.json()) as TokenResponse;
  return requireTokenSet(data);
}

export async function refreshTiktokToken(refreshToken: string): Promise<TiktokTokenSet> {
  const { clientKey, clientSecret } = getTiktokConfig();
  const body = new URLSearchParams({
    client_key: clientKey,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "Cache-Control": "no-cache" },
    body,
  });
  const data = (await res.json()) as TokenResponse;
  return requireTokenSet(data);
}

async function fetchTiktokUserInfoWithFields(accessToken: string, fields: string[]): Promise<TiktokUserInfo> {
  const res = await fetch(`${USER_INFO_URL}?fields=${fields.join(",")}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await readTiktokJson<{ user?: TiktokUserInfo }>(res, "Não foi possível carregar a conta TikTok conectada");
  return data.user ?? {};
}

export async function fetchTiktokUserInfo(accessToken: string): Promise<TiktokUserInfo> {
  return fetchTiktokUserInfoWithFields(accessToken, [
    "open_id",
    "display_name",
    "avatar_url",
    "follower_count",
    "following_count",
    "likes_count",
    "video_count",
  ]);
}

async function fetchTiktokVideos(accessToken: string, maxPages = 5): Promise<TiktokVideo[]> {
  const videos: TiktokVideo[] = [];
  let cursor: number | undefined;

  for (let page = 0; page < maxPages; page += 1) {
    const res = await fetch(
      `${VIDEO_LIST_URL}?fields=id,create_time,title,video_description,view_count,like_count,comment_count,share_count`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ max_count: 20, ...(cursor != null ? { cursor } : {}) }),
      },
    );
    const data = await readTiktokJson<VideoListData>(res, "Não foi possível carregar os vídeos da conta TikTok");
    videos.push(...(data.videos ?? []));

    if (!data.has_more || data.cursor == null) break;
    cursor = data.cursor;
  }

  return videos;
}

export async function saveTiktokConnection(opts: {
  reportId: string;
  accessToken: string;
  refreshToken: string;
  openId?: string;
  displayName?: string;
}) {
  const { error } = await supabaseAdmin.from("tiktok_connections").upsert(
    {
      report_id: opts.reportId,
      access_token: opts.accessToken,
      refresh_token: opts.refreshToken,
      tiktok_advertiser_id: opts.openId,
      tiktok_email: opts.displayName,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "report_id" },
  );
  if (error) throw error;
}

function safeDiv(a: number | null | undefined, b: number | null | undefined): number | null {
  if (a == null || b == null || !b || Number.isNaN(a) || Number.isNaN(b)) return null;
  return a / b;
}

function shiftDate(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function rangeToBounds(range: TiktokRange): { from: string; to: string } {
  if (range.dateFrom && range.dateTo) return { from: range.dateFrom, to: range.dateTo };

  const preset = range.datePreset ?? "last_30d";
  const now = new Date();

  if (preset === "this_month") {
    return {
      from: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10),
      to: todayIso(),
    };
  }

  if (preset === "last_month") {
    const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));
    return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
  }

  const to = todayIso();
  const days = rangeToDays(range);
  return { from: shiftDate(to, -(days - 1)), to };
}

function previousBounds(bounds: { from: string; to: string }): { from: string; to: string } {
  const from = new Date(`${bounds.from}T00:00:00Z`).getTime();
  const to = new Date(`${bounds.to}T00:00:00Z`).getTime();
  const days = Math.max(1, Math.round((to - from) / 86_400_000) + 1);
  const previousTo = shiftDate(bounds.from, -1);
  return { from: shiftDate(previousTo, -(days - 1)), to: previousTo };
}

function rangeToDays(range: TiktokRange): number {
  if (range.dateFrom && range.dateTo) {
    const from = new Date(`${range.dateFrom}T00:00:00Z`).getTime();
    const to = new Date(`${range.dateTo}T00:00:00Z`).getTime();
    return Math.max(1, Math.round((to - from) / 86_400_000) + 1);
  }

  const preset = range.datePreset ?? "last_30d";
  const daysMatch = /^last_(\d+)d$/.exec(preset);
  if (daysMatch?.[1]) return Number.parseInt(daysMatch[1], 10);

  const monthsMatch = /^last_(\d+)m$/.exec(preset);
  if (monthsMatch?.[1]) return Number.parseInt(monthsMatch[1], 10) * 30;

  if (preset === "last_y" || preset === "last_year") return 365;
  if (preset === "last_7d") return 7;
  if (preset === "last_90d") return 90;
  return 30;
}

function videoDate(video: TiktokVideo): string | null {
  if (!video.create_time) return null;
  return new Date(video.create_time * 1000).toISOString().slice(0, 10);
}

function videoInBounds(video: TiktokVideo, bounds: { from: string; to: string }): boolean {
  const date = videoDate(video);
  return !!date && date >= bounds.from && date <= bounds.to;
}

function aggregateVideos(videos: TiktokVideo[]): Record<string, number | null> {
  return videos.reduce<Record<string, number | null>>(
    (acc, video) => ({
      videos: (acc.videos ?? 0) + 1,
      video_views: (acc.video_views ?? 0) + (video.view_count ?? 0),
      likes: (acc.likes ?? 0) + (video.like_count ?? 0),
      comments: (acc.comments ?? 0) + (video.comment_count ?? 0),
      shares: (acc.shares ?? 0) + (video.share_count ?? 0),
    }),
    { videos: 0, video_views: 0, likes: 0, comments: 0, shares: 0 },
  );
}

function buildDailyRowsFromVideos(videos: TiktokVideo[], bounds: { from: string; to: string }) {
  const daily = new Map<string, Record<string, number>>();
  for (const video of videos) {
    const date = videoDate(video);
    if (!date || date < bounds.from || date > bounds.to) continue;

    const row = daily.get(date) ?? { videos: 0, video_views: 0, likes: 0, comments: 0, shares: 0 };
    row.videos += 1;
    row.video_views += video.view_count ?? 0;
    row.likes += video.like_count ?? 0;
    row.comments += video.comment_count ?? 0;
    row.shares += video.share_count ?? 0;
    daily.set(date, row);
  }

  return Array.from(daily.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, row]) => ({ date, ...row }));
}

function buildTiktokDerived(metrics: Record<string, number | null>): Record<string, number | null> {
  const engagement = (metrics.likes ?? 0) + (metrics.comments ?? 0) + (metrics.shares ?? 0);
  const engagementRate = safeDiv(engagement, metrics.video_views);
  return engagementRate == null ? {} : { engagement_rate: engagementRate * 100 };
}

function buildTiktokInsights(derived: Record<string, number | null>) {
  const engagementRate = derived.engagement_rate;
  if (engagementRate == null) return [];

  if (engagementRate >= 5) {
    return [{ level: "success" as const, title: `Engajamento forte (${engagementRate.toFixed(2)}%)`, detail: "O perfil está gerando interação acima do benchmark orgânico.", metric: "engagement_rate" }];
  }

  if (engagementRate < 1) {
    return [{ level: "warning" as const, title: `Engajamento baixo (${engagementRate.toFixed(2)}%)`, detail: "Vale revisar ganchos, formatos e frequência dos vídeos.", metric: "engagement_rate" }];
  }

  return [];
}

export async function fetchTiktokMetricGroups(reportId: string, range: TiktokRange = { datePreset: "last_30d" }): Promise<TiktokMetricGroup[]> {
  const { data: conn, error } = await supabaseAdmin
    .from("tiktok_connections")
    .select("id, report_id, tiktok_advertiser_id, tiktok_email, access_token, refresh_token, updated_at")
    .eq("report_id", reportId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  if (!conn) return [];

  const bounds = rangeToBounds(range);
  const prevBounds = previousBounds(bounds);
  let accessToken = conn.access_token;
  let refreshToken = conn.refresh_token;
  let user: TiktokUserInfo = {};
  let videos: TiktokVideo[] = [];
  let apiError: string | undefined = accessToken ? undefined : "A conexão TikTok não possui token ativo. Reconecte o TikTok neste relatório.";

  const loadData = async (token: string) => {
    const [userResult, videoResult] = await Promise.allSettled([
      fetchTiktokUserInfo(token).catch(async (userError: unknown) => {
        if (!isMissingScopeError(userError)) throw userError;
        return fetchTiktokUserInfoWithFields(token, ["open_id", "display_name", "avatar_url"]);
      }),
      fetchTiktokVideos(token),
    ]);

    const loadedUser = userResult.status === "fulfilled" ? userResult.value : {};
    const loadedVideos = videoResult.status === "fulfilled" ? videoResult.value : [];
    const firstError = userResult.status === "rejected" ? userResult.reason : videoResult.status === "rejected" ? videoResult.reason : null;

    if (firstError) throw firstError;
    return { user: loadedUser, videos: loadedVideos };
  };

  if (accessToken) {
    try {
      const loaded = await loadData(accessToken);
      user = loaded.user;
      videos = loaded.videos;
    } catch (loadError) {
      if (refreshToken && isRefreshableAuthError(loadError) && !isMissingScopeError(loadError)) {
        const refreshed = await refreshTiktokToken(refreshToken);
        accessToken = refreshed.access_token;
        refreshToken = refreshed.refresh_token;
        await saveTiktokConnection({
          reportId,
          accessToken,
          refreshToken,
          openId: refreshed.open_id ?? conn.tiktok_advertiser_id ?? undefined,
          displayName: conn.tiktok_email ?? undefined,
        });

        const loaded = await loadData(accessToken);
        user = loaded.user;
        videos = loaded.videos;
      } else {
        apiError = isMissingScopeError(loadError)
          ? "A conta TikTok conectada não concedeu acesso às métricas. Reconecte o TikTok para autorizar os escopos user.info.stats e video.list."
          : `Erro ao carregar dados reais do TikTok: ${(loadError as Error).message}`;
      }
    }
  }

  const currentVideos = videos.filter((video) => videoInBounds(video, bounds));
  const previousVideos = videos.filter((video) => videoInBounds(video, prevBounds));
  const currentVideoMetrics = aggregateVideos(currentVideos);
  const previous = aggregateVideos(previousVideos);
  const metrics: Record<string, number | null> = {
    follower_count: user.follower_count ?? null,
    following_count: user.following_count ?? null,
    likes_count: user.likes_count ?? null,
    video_count: user.video_count ?? null,
    ...currentVideoMetrics,
  };
  const derived = buildTiktokDerived(metrics);
  const derivedPrevious = buildTiktokDerived(previous);

  return [
    {
      connector: "tiktok_oauth",
      account_id: user.open_id ?? conn.tiktok_advertiser_id ?? "tiktok_account",
      account_name: user.display_name ?? conn.tiktok_email ?? "TikTok",
      metrics,
      previous,
      derived,
      derivedPrevious,
      insights: buildTiktokInsights(derived),
      daily: buildDailyRowsFromVideos(videos, bounds),
      error: apiError,
    },
  ];
}

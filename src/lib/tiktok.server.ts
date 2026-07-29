import { supabaseAdmin } from "@/integrations/supabase/client.server";

// TikTok Login Kit (v2) — fluxo orgânico
const AUTH_URL = "https://www.tiktok.com/v2/auth/authorize/";
const TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
const USER_INFO_URL = "https://open.tiktokapis.com/v2/user/info/";
const TIKTOK_REDIRECT_URI = "https://dashcompass.com/auth/tiktok/callback";
const SCOPES = "user.info.basic";

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
  error?: string;
  error_description?: string;
};

export async function exchangeTiktokCode(code: string) {
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
  if (!data.access_token || !data.refresh_token) {
    throw new Error(`Erro TikTok Token: ${data.error_description || data.error || JSON.stringify(data)}`);
  }
  return data;
}

export async function fetchTiktokUserInfo(accessToken: string): Promise<{ open_id?: string; display_name?: string }> {
  const res = await fetch(`${USER_INFO_URL}?fields=open_id,display_name`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = (await res.json()) as { data?: { user?: { open_id?: string; display_name?: string } } };
  return json.data?.user ?? {};
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

export async function fetchTiktokMetricGroups(reportId: string, range: any): Promise<any[]> {
  const { data: conn } = await supabaseAdmin
    .from("tiktok_connections")
    .select("*")
    .eq("report_id", reportId)
    .maybeSingle();

  if (!conn) return [];

  const { clientKey, clientSecret } = getTiktokConfig();
  
  // Se tivermos um access_token, tentamos buscar métricas reais de vídeo/usuário
  // Por enquanto, o Login Kit v2 fornece dados básicos. 
  // Para métricas de performance, seriam necessários escopos como video.list, video.data
  
  return [{
    connector: "tiktok_organic",
    account_id: conn.tiktok_advertiser_id || "tiktok_account",
    account_name: conn.tiktok_email || "TikTok Orgânico",
    metrics: {
      follows: 0,
      video_views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      reach: 0,
      impressions: 0,
      profile_views: 0,
    },
    previous: {
      follows: 0,
      video_views: 0,
    },
    derived: {
      engagement_rate: 0,
    },
    derivedPrevious: {},
    insights: [],
    daily: [
      { date: new Date().toISOString().slice(0, 10), video_views: 0, likes: 0 }
    ]
  }];
}

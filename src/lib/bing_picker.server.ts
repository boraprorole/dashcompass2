import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function getBingAccessToken(refreshToken: string) {
  const BING_TOKEN_URL = "https://www.bing.com/webmasters/oauth/token";
  
  const bingClientId = process.env.BING_CLIENT_ID?.trim();
  const msClientId = process.env.MICROSOFT_CLIENT_ID?.trim();
  const clientId = bingClientId || msClientId;

  const bingClientSecret = process.env.BING_CLIENT_SECRET?.trim();
  const msClientSecret = process.env.MICROSOFT_CLIENT_SECRET?.trim();
  const clientSecret = bingClientSecret || msClientSecret;

  if (!clientId || !clientSecret) throw new Error("Credenciais do Bing/Microsoft não configuradas");

  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("client_secret", clientSecret);
  params.append("refresh_token", refreshToken);
  params.append("grant_type", "refresh_token");

  const res = await fetch(BING_TOKEN_URL, {
    method: "POST",
    headers: { 
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json"
    },
    body: params.toString(),
  });

  if (!res.ok) throw new Error(`Bing refresh token error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.access_token as string;
}

export async function listBingSites(reportId: string) {
  const { data: conn } = await supabaseAdmin
    .from("bing_connections")
    .select("refresh_token, site_url")
    .eq("report_id", reportId)
    .single();

  if (!conn?.refresh_token) throw new Error("Bing not connected");

  const debugMode = process.env.BING_OAUTH_DEBUG === "true";
  if (debugMode) {
    console.log(`[BING DIAGNOSTIC] Iniciando listBingSites para reportId: ${reportId}`);
  }

  const accessToken = await getBingAccessToken(conn.refresh_token);

  if (debugMode) {
    console.log(`[BING DIAGNOSTIC] Token obtido, chamando GetUserSites`);
  }

  const res = await fetch(`https://www.bing.com/webmasters/api/json/v2/GetUserSites?apikey=${accessToken}`, {
    method: "GET",
    headers: { "Accept": "application/json" }
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.error(`[BING DIAGNOSTIC] Erro ao listar sites: ${res.status} - ${errorBody}`);
    throw new Error(`Failed to fetch sites from Bing: ${res.status}`);
  }
  
  const data = await res.json();
  
  if (debugMode) {
    console.log(`[BING DIAGNOSTIC] Resposta GetUserSites:`, JSON.stringify(data).substring(0, 200));
  }
  
  // The Bing API returns { d: [ { Url: "..." }, ... ] }
  const sites = (data.d || []).map((s: any) => ({
    siteUrl: s.Url || s.url
  }));

  return { sites, current: conn.site_url };
}

export async function chooseBingSite(reportId: string, siteUrl: string) {
  const { error } = await supabaseAdmin
    .from("bing_connections")
    .update({ site_url: siteUrl, updated_at: new Date().toISOString() })
    .eq("report_id", reportId);

  if (error) throw error;
  return { success: true };
}

export async function getBingStatusReal(reportId: string) {
  const { data: conn } = await supabaseAdmin
    .from("bing_connections")
    .select("*")
    .eq("report_id", reportId)
    .maybeSingle();

  if (!conn || !conn.refresh_token) {
    return { connected: false };
  }

  return {
    connected: true,
    propertySelected: !!conn.site_url && conn.site_url !== "Aguardando sincronização...",
    siteUrl: conn.site_url === "Aguardando sincronização..." ? null : conn.site_url,
    updatedAt: conn.updated_at
  };
}

export async function getBingMetricsReal(reportId: string, dateFrom?: string, dateTo?: string) {
  const { data: conn } = await supabaseAdmin
    .from("bing_connections")
    .select("*")
    .eq("report_id", reportId)
    .maybeSingle();

  if (!conn || !conn.refresh_token || !conn.site_url || conn.site_url === "Aguardando sincronização...") {
    return { connected: false, metrics: [], topKeywords: [] };
  }

  const accessToken = await getBingAccessToken(conn.refresh_token);
  const siteUrl = conn.site_url;

  // 1. Get Summary Metrics (Query Stats)
  const statsRes = await fetch(`https://www.bing.com/webmasters/api/json/v2/GetQueryStats?siteUrl=${encodeURIComponent(siteUrl)}&apikey=${accessToken}`, {
    method: "GET",
    headers: { "Accept": "application/json" }
  });

  let topKeywords: any[] = [];
  if (statsRes.ok) {
    const statsData = await statsRes.json();
    topKeywords = (statsData.d || []).map((kw: any) => ({
      query: kw.Query,
      clicks: kw.Clicks,
      impressions: kw.Impressions,
      ctr: kw.Impressions > 0 ? (kw.Clicks / kw.Impressions) * 100 : 0,
      position: kw.AvgPos
    })).sort((a: any, b: any) => b.clicks - a.clicks).slice(0, 10);
  }

  return {
    connected: true,
    siteUrl: siteUrl,
    metrics: topKeywords.map((kw, i) => ({
      date: new Date(Date.now() - i * 86400000).toISOString().split('T')[0],
      clicks: kw.clicks,
      impressions: kw.impressions,
      ctr: kw.ctr,
      position: kw.position
    })).reverse(),
    topKeywords
  };
}

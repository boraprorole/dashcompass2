import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function getBingAccessToken(refreshToken: string) {
  const BING_TOKEN_URL = "https://www.bing.com/webmasters/oauth/token";
  const debugMode = process.env.BING_OAUTH_DEBUG === "true";
  
  const bingClientId = process.env.BING_CLIENT_ID?.trim();
  const msClientId = process.env.MICROSOFT_CLIENT_ID?.trim();
  const clientId = bingClientId || msClientId;

  const bingClientSecret = process.env.BING_CLIENT_SECRET?.trim();
  const msClientSecret = process.env.MICROSOFT_CLIENT_SECRET?.trim();
  const clientSecret = bingClientSecret || msClientSecret;

  if (!clientId || !clientSecret) {
    if (debugMode) console.error("[BING DIAGNOSTIC] Credenciais ausentes:", { clientId: !!clientId, clientSecret: !!clientSecret });
    throw new Error("Credenciais do Bing/Microsoft não configuradas");
  }

  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("client_secret", clientSecret);
  params.append("refresh_token", refreshToken);
  params.append("grant_type", "refresh_token");

  if (debugMode) {
    console.log(`[BING DIAGNOSTIC] Solicitando novo access_token em: ${BING_TOKEN_URL}`);
  }

  const res = await fetch(BING_TOKEN_URL, {
    method: "POST",
    headers: { 
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json"
    },
    body: params.toString(),
  });

  const body = await res.text();
  if (debugMode) {
    console.log("==== FETCH [getBingAccessToken] ====");
    console.log("URL:", res.url);
    console.log("STATUS:", res.status);
    console.log("CONTENT-TYPE:", res.headers.get("content-type"));
    console.log("BODY:", body.substring(0, 500));
  }

  if (body.startsWith("<!DOCTYPE")) {
    throw new Error(`HTML recebido da URL ${res.url}\n\n${body.substring(0, 500)}`);
  }

  if (!res.ok) {
    throw new Error(`Bing refresh token error: ${res.status} ${body.substring(0, 100)}`);
  }
  
  const data = JSON.parse(body);
  return data.access_token as string;
}

export async function listBingSites(reportId: string) {
  const debugMode = process.env.BING_OAUTH_DEBUG === "true";
  
  if (debugMode) {
    console.log(`[BING DIAGNOSTIC] Iniciando listBingSites para reportId: ${reportId}`);
  }

  const { data: conn } = await supabaseAdmin
    .from("bing_connections")
    .select("refresh_token, site_url")
    .eq("report_id", reportId)
    .single();

  if (!conn?.refresh_token) {
    if (debugMode) console.error(`[BING DIAGNOSTIC] Conexão não encontrada para reportId: ${reportId}`);
    throw new Error("Bing not connected");
  }

  const accessToken = await getBingAccessToken(conn.refresh_token);

  // Bing Webmaster API v2 JSON endpoint
  const apiUrl = `https://www.bing.com/webmasters/api/json/v2/GetUserSites?apikey=${accessToken}`;
  
  if (debugMode) {
    console.log(`[BING DIAGNOSTIC] Token obtido, chamando GetUserSites em: ${apiUrl}`);
  }

  const res = await fetch(apiUrl, {
    method: "GET",
    headers: { 
      "Accept": "application/json" 
    }
  });

  const body = await res.text();
  if (debugMode) {
    console.log("==== FETCH [listBingSites] ====");
    console.log("URL:", res.url);
    console.log("STATUS:", res.status);
    console.log("CONTENT-TYPE:", res.headers.get("content-type"));
    console.log("BODY:", body.substring(0, 500));
  }

  if (body.startsWith("<!DOCTYPE")) {
    throw new Error(`HTML recebido da URL ${res.url}\n\n${body.substring(0, 500)}`);
  }

  if (!res.ok) {
    throw new Error(`Failed to fetch sites from Bing: ${res.status} ${body.substring(0, 100)}`);
  }
  
  const data = JSON.parse(body);
  
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

  const body = await statsRes.text();
  const debugMode = process.env.BING_OAUTH_DEBUG === "true";
  if (debugMode) {
    console.log("==== FETCH [getBingMetricsReal] ====");
    console.log("URL:", statsRes.url);
    console.log("STATUS:", statsRes.status);
    console.log("CONTENT-TYPE:", statsRes.headers.get("content-type"));
    console.log("BODY:", body.substring(0, 500));
  }

  if (body.startsWith("<!DOCTYPE")) {
    throw new Error(`HTML recebido da URL ${statsRes.url}\n\n${body.substring(0, 500)}`);
  }

  let topKeywords: any[] = [];
  if (statsRes.ok) {
    const statsData = JSON.parse(body);
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

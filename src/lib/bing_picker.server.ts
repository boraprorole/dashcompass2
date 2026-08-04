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

const BING_API_BASE = "https://ssl.bing.com/webmaster/api.svc/json";

/**
 * Chamada autenticada à API do Bing Webmaster Tools.
 *
 * IMPORTANTE: com token OAuth é obrigatório usar o host `ssl.bing.com` com o
 * header `Authorization: Bearer`. O host `www.bing.com/webmasters/api/...`
 * devolve a página HTML do portal (HTTP 200 com <!DOCTYPE html>), e o
 * parâmetro `?apikey=` só funciona com chaves de API estáticas — com token
 * OAuth ele retorna 400 InvalidApiKey.
 */
async function bingApiFetch(method: string, accessToken: string, query: Record<string, string> = {}) {
  const debugMode = process.env.BING_OAUTH_DEBUG === "true";
  const qs = new URLSearchParams(query).toString();
  const url = `${BING_API_BASE}/${method}${qs ? `?${qs}` : ""}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const body = await res.text();

  if (debugMode) {
    console.log(`==== FETCH [bing:${method}] ====`);
    console.log("URL:", res.url);
    console.log("STATUS:", res.status);
    console.log("CONTENT-TYPE:", res.headers.get("content-type"));
    console.log("BODY:", body.substring(0, 500));
  }

  if (body.startsWith("<!DOCTYPE") || body.startsWith("<html")) {
    throw new Error(`Bing ${method}: HTML recebido em vez de JSON (${res.url})`);
  }

  if (!res.ok) {
    throw new Error(`Bing ${method} falhou: ${res.status} ${body.substring(0, 150)}`);
  }

  try {
    return JSON.parse(body);
  } catch {
    throw new Error(`Bing ${method}: resposta não é JSON válido: ${body.substring(0, 150)}`);
  }
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

  const data = await bingApiFetch("GetUserSites", accessToken);

  // A API do Bing retorna { d: [ { Url: "...", IsVerified: true }, ... ] }
  const sites = (data.d || []).map((s: any) => ({
    siteUrl: s.Url || s.url,
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
  let topKeywords: any[] = [];
  try {
    const statsData = await bingApiFetch("GetQueryStats", accessToken, { siteUrl });
    topKeywords = (statsData.d || [])
      .map((kw: any) => ({
        query: kw.Query,
        clicks: kw.Clicks,
        impressions: kw.Impressions,
        ctr: kw.Impressions > 0 ? (kw.Clicks / kw.Impressions) * 100 : 0,
        position: kw.AvgPos,
      }))
      .sort((a: any, b: any) => b.clicks - a.clicks)
      .slice(0, 10);
  } catch (err) {
    // Não quebra a UI do relatório quando a API do Bing falha ou ainda não
    // possui dados agregados para a propriedade selecionada.
    console.error("[getBingMetricsReal] GetQueryStats falhou:", err);
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

/**
 * Citações por IA (AI Performance / Copilot).
 *
 * O relatório "AI Performance" do Bing Webmaster Tools (citações em Copilot e
 * respostas geradas por IA) existe apenas no portal — a Microsoft ainda não
 * publicou endpoint oficial na API v2. Tentamos os nomes de método candidatos
 * e, quando nenhum responde, devolvemos `available: false` para a UI exibir um
 * estado explícito em vez de números inventados.
 */
export async function getBingAiCitationsReal(reportId: string) {
  const { data: conn } = await supabaseAdmin
    .from("bing_connections")
    .select("refresh_token, site_url")
    .eq("report_id", reportId)
    .maybeSingle();

  if (!conn?.refresh_token || !conn.site_url || conn.site_url === "Aguardando sincronização...") {
    return { connected: false, available: false, citations: [], totals: null };
  }

  const siteUrl = conn.site_url;
  let accessToken: string;
  try {
    accessToken = await getBingAccessToken(conn.refresh_token);
  } catch (err) {
    console.error("[getBingAiCitationsReal] falha ao renovar token:", err);
    return { connected: true, available: false, citations: [], totals: null };
  }

  const candidates = ["GetAIPerformanceStats", "GetAICitationStats", "GetCopilotCitationStats"];

  for (const method of candidates) {
    try {
      const payload = await bingApiFetch(method, accessToken, { siteUrl });
      const rows = Array.isArray(payload?.d) ? payload.d : [];
      if (rows.length === 0) continue;

      const citations = rows.map((r: any) => ({
        url: r.Url ?? r.Page ?? r.url ?? "—",
        query: r.Query ?? r.GroundingQuery ?? null,
        citations: Number(r.Citations ?? r.CitationCount ?? 0) || 0,
        impressions: Number(r.Impressions ?? 0) || 0,
      }));

      return {
        connected: true,
        available: true,
        siteUrl,
        citations,
        totals: {
          citations: citations.reduce((a: number, c: any) => a + c.citations, 0),
          pages: new Set(citations.map((c: any) => c.url)).size,
        },
      };
    } catch (err) {
      console.error(`[getBingAiCitationsReal] ${method} indisponível:`, (err as Error).message);
    }
  }

  return { connected: true, available: false, siteUrl, citations: [], totals: null };
}

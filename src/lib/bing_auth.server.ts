import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { signState } from "@/lib/ga.server";

const BING_AUTH_URL = "https://www.bing.com/webmasters/oauth/authorize";
const BING_TOKEN_URL = "https://www.bing.com/webmasters/oauth/token";
const BING_SCOPES = "webmaster.manage";

const REDIRECT_URI = "https://www.dashcompass.com/api/public/bing/oauth/callback/";

function maskSecret(secret: string | undefined): string {
  if (!secret) return "não presente";
  const len = secret.length;
  if (len <= 8) return "********";
  return `${secret.substring(0, 4)}****${secret.substring(len - 4)}`;
}

function debugLog(message: string, data?: any) {
  if (process.env.BING_OAUTH_DEBUG === "true") {
    console.log(`[BING OAUTH DEBUG] ${message}`, data ? JSON.stringify(data, null, 2) : "");
  }
}

export async function getBingAuthUrl(reportId: string, userId: string) {
  const bingClientId = process.env.BING_CLIENT_ID?.trim();
  const msClientId = process.env.MICROSOFT_CLIENT_ID?.trim();
  const clientId = bingClientId || msClientId;

  if (process.env.BING_OAUTH_DEBUG === "true") {
    debugLog("Iniciando fluxo de autorização", {
      clientIdSource: bingClientId ? "BING_CLIENT_ID" : (msClientId ? "MICROSOFT_CLIENT_ID" : "nenhum"),
      clientIdMasked: maskSecret(clientId)
    });
  }

  if (!clientId) throw new Error("Client ID do Bing não configurado (BING_CLIENT_ID ou MICROSOFT_CLIENT_ID)");

  const state = await signState({ reportId, userId, provider: 'bing' });

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: REDIRECT_URI,
    scope: BING_SCOPES,
    state: state
  });

  return `${BING_AUTH_URL}?${params.toString()}`;
}

export async function exchangeBingCode(code: string) {
  const bingClientId = process.env.BING_CLIENT_ID?.trim();
  const msClientId = process.env.MICROSOFT_CLIENT_ID?.trim();
  const clientId = bingClientId || msClientId;

  const bingClientSecret = process.env.BING_CLIENT_SECRET?.trim();
  const msClientSecret = process.env.MICROSOFT_CLIENT_SECRET?.trim();
  const clientSecret = bingClientSecret || msClientSecret;

  const debugMode = process.env.BING_OAUTH_DEBUG === "true";

  if (debugMode) {
    debugLog("Iniciando troca de código por token", {
      clientIdSource: bingClientId ? "BING_CLIENT_ID" : (msClientId ? "MICROSOFT_CLIENT_ID" : "nenhum"),
      clientSecretSource: bingClientSecret ? "BING_CLIENT_SECRET" : (msClientSecret ? "MICROSOFT_CLIENT_SECRET" : "nenhum"),
      clientSecretExists: !!clientSecret
    });
    debugLog("Variáveis de ambiente:", {
      clientId: maskSecret(clientId),
      clientSecret: {
        presente: !!clientSecret,
        tamanho: clientSecret?.length || 0,
        preview: clientSecret ? `${clientSecret.substring(0, 3)}...${clientSecret.substring(clientSecret.length - 3)}` : "n/a"
      },
      BING_REDIRECT_URI: REDIRECT_URI
    });
  }

  if (!clientId || !clientSecret) {
    throw new Error(`Configuração incompleta: BING_CLIENT_ID=${!!clientId}, BING_CLIENT_SECRET=${!!clientSecret}`);
  }

  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("client_secret", clientSecret);
  params.append("code", code);
  params.append("grant_type", "authorization_code");
  params.append("redirect_uri", REDIRECT_URI);

  if (debugMode) {
    debugLog("Requisição preparada:", {
      endpoint: BING_TOKEN_URL,
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json"
      },
      body: {
        grant_type: "authorization_code",
        redirect_uri: REDIRECT_URI,
        client_id: maskSecret(clientId),
        code_length: code.length
      }
    });
  }

  const res = await fetch(BING_TOKEN_URL, {
    method: "POST",
    headers: { 
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json"
    },
    body: params.toString(),
  });

  const responseText = await res.text();
  
  if (debugMode) {
    let parsedJson = null;
    try { parsedJson = JSON.parse(responseText); } catch (e) {}
    
    debugLog("Resposta do Bing:", {
      status: res.status,
      statusText: res.statusText,
      headers: Object.fromEntries(res.headers.entries()),
      rawBody: responseText,
      parsedJson
    });
  }

  if (!res.ok) {
    console.error("Bing Token Exchange Error:", res.status, responseText);
    throw new Error(`Bing token exchange: ${res.status} ${responseText}`);
  }

  try {
    return JSON.parse(responseText) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };
  } catch (e) {
    throw new Error("Erro ao parsear JSON de sucesso do Bing");
  }
}

export async function saveBingConnection({ 
  reportId, 
  refreshToken, 
  siteUrl 
}: { 
  reportId: string; 
  refreshToken: string; 
  siteUrl: string;
}) {
  const debugMode = process.env.BING_OAUTH_DEBUG === "true";
  
  if (debugMode) {
    debugLog("Salvando conexão no banco", {
      reportId,
      siteUrl,
      refreshTokenMasked: maskSecret(refreshToken)
    });
  }

  const { error } = await supabaseAdmin
    .from("bing_connections")
    .upsert({
      report_id: reportId,
      refresh_token: refreshToken,
      site_url: siteUrl,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'report_id' });

  if (error) {
    console.error("Erro ao salvar conexão Bing no Supabase:", error);
    throw error;
  }

  if (debugMode) {
    debugLog("Conexão salva com sucesso no banco");
  }
}

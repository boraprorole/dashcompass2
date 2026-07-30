import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { signState } from "@/lib/ga.server";

const BING_AUTH_URL = "https://www.bing.com/webmasters/oauth/authorize";
const BING_TOKEN_URL = "https://www.bing.com/webmasters/oauth/token";
const BING_SCOPES = "webmaster.manage";

const REDIRECT_URI = "https://www.dashcompass.com/api/public/bing/oauth/callback";

export async function getBingAuthUrl(reportId: string, userId: string) {
  const clientId = process.env.MICROSOFT_CLIENT_ID?.trim();
  if (!clientId) throw new Error("MICROSOFT_CLIENT_ID não configurado ou está em branco");

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
  const clientId = process.env.MICROSOFT_CLIENT_ID?.trim();
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) throw new Error("Credenciais do Bing (Client ID/Secret) não configuradas no ambiente");

  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("client_secret", clientSecret);
  params.append("code", code);
  params.append("grant_type", "authorization_code");
  params.append("redirect_uri", REDIRECT_URI);
  params.append("scope", BING_SCOPES);

  const body = params.toString();
  console.log("Bing Token Exchange Body (sanitized):", body.replace(clientSecret, "REDACTED"));

  const res = await fetch(BING_TOKEN_URL, {
    method: "POST",
    headers: { 
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json"
    },
    body: body,
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("Bing Token Exchange Error:", res.status, errorText);
    throw new Error(`Bing token exchange: ${res.status} ${errorText}`);
  }
  return (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
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
  const { error } = await supabaseAdmin
    .from("bing_connections")
    .upsert({
      report_id: reportId,
      refresh_token: refreshToken,
      site_url: siteUrl,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'report_id' });

  if (error) throw error;
}

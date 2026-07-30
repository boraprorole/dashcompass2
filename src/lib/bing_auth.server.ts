import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { signState } from "@/lib/ga.server";

const BING_AUTH_URL = "https://www.bing.com/webmasters/oauth/authorize";
const BING_TOKEN_URL = "https://www.bing.com/webmasters/oauth/token";
const BING_SCOPES = "https://www.bing.com/webmaster.readonly";

const REDIRECT_URI = "https://www.dashcompass.com/api/public/bing/oauth/callback";

export async function getBingAuthUrl(reportId: string, userId: string) {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  if (!clientId) throw new Error("MICROSOFT_CLIENT_ID não configurado");

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
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Microsoft OAuth não configurado");

  const res = await fetch(BING_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: REDIRECT_URI,
      scope: BING_SCOPES,
    }),
  });

  if (!res.ok) throw new Error(`Bing token exchange: ${res.status} ${await res.text()}`);
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

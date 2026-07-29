import { supabaseAdmin } from "@/integrations/supabase/client.server";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

export const GOOGLE_SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/analytics.readonly",
  "https://www.googleapis.com/auth/adwords",
  "https://www.googleapis.com/auth/webmasters.readonly",
].join(" ");

const ORIGIN = "https://www.dashcompass.com";

export function getGoogleRedirectUri() {
  return `${ORIGIN}/api/public/google.oauth.callback`;
}

// Re-using common logic or duplicating for simplicity in this turn
// Better to have a shared util but following the pattern in ga.server.ts for now
function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmacSha256(key: string, message: string): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, enc.encode(message));
  return new Uint8Array(sig);
}

function stateSecret() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || "fallback";
}

export async function signGoogleState(payload: Record<string, unknown>): Promise<string> {
  const body = toBase64Url(new TextEncoder().encode(JSON.stringify({ ...payload, ts: Date.now() })));
  const sig = toBase64Url(await hmacSha256(stateSecret(), body));
  return `${body}.${sig}`;
}

export async function buildGoogleAuthUrl(opts: { reportId: string; userId: string }) {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  if (!clientId) throw new Error("GOOGLE_OAUTH_CLIENT_ID não configurado");
  const state = await signGoogleState({ reportId: opts.reportId, userId: opts.userId });
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getGoogleRedirectUri(),
    response_type: "code",
    scope: GOOGLE_SCOPES,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

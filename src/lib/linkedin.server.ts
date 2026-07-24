import { supabaseAdmin } from "@/integrations/supabase/client.server";

const LI_AUTH_BASE = "https://www.linkedin.com/oauth/v2";
const LI_API_BASE = "https://api.linkedin.com";
const LI_OAUTH_ORIGIN = "https://dashboard.marsala.ag";

// Community Management scopes — leem posts, engajamento e stats de Company Page.
export const LINKEDIN_SCOPES = [
  "r_organization_social",
  "rw_organization_admin",
  "r_organization_admin",
].join(" ");

export function getLinkedInRedirectUri() {
  return `${LI_OAUTH_ORIGIN}/api/public/linkedin/oauth/callback`;
}

function getCredentials(): { clientId: string; clientSecret: string } {
  const clientId = process.env.LINKEDIN_CLIENT_ID ?? "";
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET ?? "";
  if (!clientId || !clientSecret) {
    throw new Error(
      "LINKEDIN_CLIENT_ID / LINKEDIN_CLIENT_SECRET não configurados nos secrets do projeto.",
    );
  }
  return { clientId, clientSecret };
}

// -- state signing (HMAC-SHA256) --
function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromBase64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
async function hmacSha256(key: string, message: string): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", k, enc.encode(message));
  return new Uint8Array(sig);
}
function timingSafeEqualBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a[i] ^ b[i];
  return r === 0;
}
function stateSecret() {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.LOVABLE_API_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    "fallback"
  );
}
export async function signLinkedInState(payload: Record<string, unknown>): Promise<string> {
  const body = toBase64Url(
    new TextEncoder().encode(JSON.stringify({ ...payload, ts: Date.now() })),
  );
  const sig = toBase64Url(await hmacSha256(stateSecret(), body));
  return `${body}.${sig}`;
}
export async function verifyLinkedInState(state: string): Promise<Record<string, unknown>> {
  const [body, sig] = state.split(".");
  if (!body || !sig) throw new Error("state inválido");
  const expected = toBase64Url(await hmacSha256(stateSecret(), body));
  if (!timingSafeEqualBytes(new TextEncoder().encode(sig), new TextEncoder().encode(expected))) {
    throw new Error("state assinatura inválida");
  }
  const parsed = JSON.parse(new TextDecoder().decode(fromBase64Url(body)));
  if (typeof parsed.ts !== "number" || Date.now() - parsed.ts > 15 * 60_000) {
    throw new Error("state expirado");
  }
  return parsed;
}

// -- OAuth --

export async function buildLinkedInAuthUrl(reportId: string, userId: string) {
  const { clientId } = getCredentials();
  const state = await signLinkedInState({ reportId, userId });
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: getLinkedInRedirectUri(),
    state,
    scope: LINKEDIN_SCOPES,
  });
  return `${LI_AUTH_BASE}/authorization?${params.toString()}`;
}

type LinkedInTokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
  scope?: string;
};

export async function exchangeLinkedInCode(code: string): Promise<LinkedInTokenResponse> {
  const { clientId, clientSecret } = getCredentials();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: getLinkedInRedirectUri(),
    client_id: clientId,
    client_secret: clientSecret,
  });
  const res = await fetch(`${LI_AUTH_BASE}/accessToken`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`LinkedIn token exchange: ${res.status} ${await res.text()}`);
  return (await res.json()) as LinkedInTokenResponse;
}

export async function refreshLinkedInToken(refreshToken: string): Promise<LinkedInTokenResponse> {
  const { clientId, clientSecret } = getCredentials();
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });
  const res = await fetch(`${LI_AUTH_BASE}/accessToken`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`LinkedIn refresh: ${res.status} ${await res.text()}`);
  return (await res.json()) as LinkedInTokenResponse;
}

// -- Org discovery (para escolher a Company Page administrada) --

type OrgAcl = {
  organization?: string; // URN "urn:li:organization:12345"
  "organization~"?: { id?: number; localizedName?: string; vanityName?: string };
};

export async function listAdminOrganizations(accessToken: string): Promise<
  Array<{ urn: string; id: number | null; name: string | null; vanityName: string | null }>
> {
  const url = `${LI_API_BASE}/v2/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&state=APPROVED&projection=(elements*(organization~(id,localizedName,vanityName)))`;
  const res = await fetch(url, {
    headers: {
      authorization: `Bearer ${accessToken}`,
      "x-restli-protocol-version": "2.0.0",
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `LinkedIn organizationAcls: ${res.status} ${body}. ` +
        "Verifique se o app tem o produto 'Community Management API' aprovado e se o usuário é ADMINISTRATOR aprovado da Company Page.",
    );
  }
  const json = (await res.json()) as { elements?: OrgAcl[] };
  const elements = json.elements ?? [];
  return elements
    .map((el) => {
      const urn = el.organization ?? "";
      const inner = el["organization~"] ?? {};
      return {
        urn,
        id: typeof inner.id === "number" ? inner.id : null,
        name: inner.localizedName ?? null,
        vanityName: inner.vanityName ?? null,
      };
    })
    .filter((o) => o.urn);
}

export async function saveLinkedInConnection(opts: {
  reportId: string;
  tokens: LinkedInTokenResponse;
  organization: { urn: string; name: string | null };
}) {
  const expiresAt = new Date(Date.now() + (opts.tokens.expires_in - 60) * 1000).toISOString();
  const refreshExpiresAt = opts.tokens.refresh_token_expires_in
    ? new Date(Date.now() + opts.tokens.refresh_token_expires_in * 1000).toISOString()
    : null;

  const { error } = await supabaseAdmin.from("linkedin_connections").upsert(
    {
      report_id: opts.reportId,
      organization_urn: opts.organization.urn,
      organization_name: opts.organization.name,
      access_token: opts.tokens.access_token,
      refresh_token: opts.tokens.refresh_token ?? null,
      expires_at: expiresAt,
      refresh_token_expires_at: refreshExpiresAt,
      scope: opts.tokens.scope ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "report_id" },
  );
  if (error) throw new Error(error.message);
}

// -- Admin helpers --

export async function assertAdminLinkedIn(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Forbidden: admin only");
}

export async function listLinkedInConnectionsImpl(reportId: string) {
  const { data, error } = await supabaseAdmin
    .from("linkedin_connections")
    .select(
      "id, organization_urn, organization_name, expires_at, refresh_token_expires_at, scope, created_at, updated_at",
    )
    .eq("report_id", reportId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function deleteLinkedInConnectionImpl(id: string) {
  const { error } = await supabaseAdmin.from("linkedin_connections").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

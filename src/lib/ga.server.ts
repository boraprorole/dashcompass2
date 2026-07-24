import { supabaseAdmin } from "@/integrations/supabase/client.server";

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

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";
const GA_DATA_URL = "https://analyticsdata.googleapis.com/v1beta";

export const GA_SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/analytics.readonly",
  "https://www.googleapis.com/auth/adwords",
].join(" ");

const GA_OAUTH_ORIGIN = "https://www.dashcompass.com";

export function getRedirectUri(_origin?: string) {
  return `${GA_OAUTH_ORIGIN}/api/public/ga/oauth/callback`;
}

function stateSecret() {
  const s =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.LOVABLE_API_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    "fallback";
  return s;
}

export async function signState(payload: Record<string, unknown>): Promise<string> {
  const body = toBase64Url(
    new TextEncoder().encode(JSON.stringify({ ...payload, ts: Date.now() })),
  );
  const sig = toBase64Url(await hmacSha256(stateSecret(), body));
  return `${body}.${sig}`;
}

export async function verifyState(state: string): Promise<Record<string, unknown>> {
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

export async function buildAuthUrl(opts: { origin: string; reportId: string; userId: string }) {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  if (!clientId) throw new Error("GOOGLE_OAUTH_CLIENT_ID não configurado");
  const state = await signState({ reportId: opts.reportId, userId: opts.userId });
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getRedirectUri(opts.origin),
    response_type: "code",
    scope: GA_SCOPES,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export async function exchangeCode(code: string, origin: string, redirectUriOverride?: string) {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Google OAuth não configurado");
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUriOverride ?? getRedirectUri(origin),
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`token exchange: ${res.status} ${await res.text()}`);
  return (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope: string;
    token_type: string;
    id_token?: string;
  };
}

export async function refreshAccessToken(refreshToken: string) {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Google OAuth não configurado");
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`refresh: ${res.status} ${await res.text()}`);
  return (await res.json()) as { access_token: string; expires_in: number };
}

export async function fetchGoogleEmail(accessToken: string) {
  const res = await fetch(USERINFO_URL, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  const j = (await res.json()) as { email?: string };
  return j.email ?? null;
}

export async function assertAdminGa(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Forbidden: admin only");
}

export async function listGaConnectionsImpl(userId: string, reportId: string) {
  await assertAdminGa(userId);
  const { data, error } = await supabaseAdmin
    .from("ga_connections")
    .select("id, ga_property_id, label, google_email, created_at")
    .eq("report_id", reportId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function deleteGaConnectionImpl(userId: string, id: string) {
  await assertAdminGa(userId);
  const { error } = await supabaseAdmin.from("ga_connections").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function updateGaConnectionImpl(
  userId: string,
  id: string,
  patch: { ga_property_id?: string; label?: string },
) {
  await assertAdminGa(userId);
  const { error } = await supabaseAdmin.from("ga_connections").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

async function getConnection(id: string) {
  const { data, error } = await supabaseAdmin
    .from("ga_connections")
    .select("id, report_id, ga_property_id, refresh_token")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Conexão GA não encontrada");
  return data;
}

/** List GA4 properties the connected account can access (via Admin API). */
export async function listGaAccountPropertiesImpl(userId: string, connectionId: string) {
  await assertAdminGa(userId);
  const conn = await getConnection(connectionId);
  const { access_token } = await refreshAccessToken(conn.refresh_token);
  const res = await fetch(
    "https://analyticsadmin.googleapis.com/v1beta/accountSummaries?pageSize=200",
    { headers: { authorization: `Bearer ${access_token}` } },
  );
  if (!res.ok) throw new Error(`GA Admin: ${res.status} ${await res.text()}`);
  const j = (await res.json()) as {
    accountSummaries?: Array<{
      account: string;
      displayName: string;
      propertySummaries?: Array<{ property: string; displayName: string }>;
    }>;
  };
  const out: Array<{ propertyId: string; displayName: string; account: string }> = [];
  for (const acc of j.accountSummaries ?? []) {
    for (const p of acc.propertySummaries ?? []) {
      out.push({
        propertyId: p.property.replace("properties/", ""),
        displayName: p.displayName,
        account: acc.displayName,
      });
    }
  }
  return out;
}

export type GaMetricsRange = "7d" | "28d" | "90d" | "thisMonth" | "lastMonth";

function rangeToDates(range: GaMetricsRange): { startDate: string; endDate: string } {
  const today = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  if (range === "thisMonth") {
    const s = new Date(today.getFullYear(), today.getMonth(), 1);
    return { startDate: iso(s), endDate: iso(today) };
  }
  if (range === "lastMonth") {
    const s = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const e = new Date(today.getFullYear(), today.getMonth(), 0);
    return { startDate: iso(s), endDate: iso(e) };
  }
  const days = range === "7d" ? 7 : range === "28d" ? 28 : 90;
  const s = new Date(today);
  s.setDate(s.getDate() - days + 1);
  return { startDate: iso(s), endDate: iso(today) };
}

async function runReport(
  refreshToken: string,
  propertyId: string,
  body: Record<string, unknown>,
) {
  const { access_token } = await refreshAccessToken(refreshToken);
  const res = await fetch(`${GA_DATA_URL}/properties/${propertyId}:runReport`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${access_token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`GA runReport: ${res.status} ${await res.text()}`);
  return (await res.json()) as {
    rows?: Array<{
      dimensionValues?: Array<{ value: string }>;
      metricValues?: Array<{ value: string }>;
    }>;
    totals?: Array<{ metricValues?: Array<{ value: string }> }>;
  };
}

export async function getGaMetricsImpl(
  userId: string,
  reportId: string,
  range: GaMetricsRange = "28d",
  customDates?: { startDate: string; endDate: string },
) {
  await assertAdminGa(userId);
  const { data: conns, error } = await supabaseAdmin
    .from("ga_connections")
    .select("id, ga_property_id, label, refresh_token")
    .eq("report_id", reportId);
  if (error) throw new Error(error.message);
  if (!conns || conns.length === 0) return { properties: [] };

  const { startDate, endDate } = customDates ?? rangeToDates(range);
  const metrics = [
    "activeUsers",
    "newUsers",
    "sessions",
    "screenPageViews",
    "engagementRate",
    "averageSessionDuration",
    "bounceRate",
    "conversions",
  ];

  const AI_SOURCES = [
    "perplexity.ai",
    "gemini.google.com",
    "copilot.com",
    "claude.ai",
    "chatgpt.com",
    "chat.chaton.ai",
    "chat.openai.com",
    "bing.com/chat",
    "you.com",
    "poe.com",
  ];
  const aiSourceFilter = {
    orGroup: {
      expressions: AI_SOURCES.map((s) => ({
        filter: {
          fieldName: "sessionSource",
          stringFilter: { matchType: "CONTAINS", value: s },
        },
      })),
    },
  };

  // AI Traffic monthly YTD range: from Jan 1 of the reference year through
  // the earlier of endDate or Dec 31 of that year.
  const refYear = Number(endDate.slice(0, 4));
  const ytdStart = `${refYear}-01-01`;
  const ytdEnd = endDate.slice(0, 4) === String(refYear) ? endDate : `${refYear}-12-31`;

  const results = await Promise.all(
    conns.map(async (c) => {
      try {
        const [totals, timeseries, channels, topPages, aiSources, aiLanding, aiMonthly, usersMonthly] = await Promise.all([
          runReport(c.refresh_token, c.ga_property_id, {
            dateRanges: [{ startDate, endDate }],
            metrics: metrics.map((name) => ({ name })),
          }),
          runReport(c.refresh_token, c.ga_property_id, {
            dateRanges: [{ startDate, endDate }],
            dimensions: [{ name: "date" }],
            metrics: [{ name: "activeUsers" }, { name: "sessions" }],
            orderBys: [{ dimension: { dimensionName: "date" } }],
          }),
          runReport(c.refresh_token, c.ga_property_id, {
            dateRanges: [{ startDate, endDate }],
            dimensions: [{ name: "sessionDefaultChannelGroup" }],
            metrics: [{ name: "sessions" }, { name: "activeUsers" }],
            orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
            limit: 10,
          }),
          runReport(c.refresh_token, c.ga_property_id, {
            dateRanges: [{ startDate, endDate }],
            dimensions: [{ name: "pagePath" }],
            metrics: [{ name: "screenPageViews" }, { name: "activeUsers" }],
            orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
            limit: 10,
          }),
          runReport(c.refresh_token, c.ga_property_id, {
            dateRanges: [{ startDate, endDate }],
            dimensions: [{ name: "sessionSource" }],
            metrics: [{ name: "sessions" }, { name: "activeUsers" }],
            dimensionFilter: aiSourceFilter,
            orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
            limit: 25,
          }),
          runReport(c.refresh_token, c.ga_property_id, {
            dateRanges: [{ startDate, endDate }],
            dimensions: [{ name: "landingPage" }, { name: "sessionSource" }],
            metrics: [{ name: "sessions" }, { name: "activeUsers" }],
            dimensionFilter: aiSourceFilter,
            orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
            limit: 25,
          }),
          runReport(c.refresh_token, c.ga_property_id, {
            dateRanges: [{ startDate: ytdStart, endDate: ytdEnd }],
            dimensions: [{ name: "yearMonth" }],
            metrics: [{ name: "sessions" }],
            dimensionFilter: aiSourceFilter,
            orderBys: [{ dimension: { dimensionName: "yearMonth" } }],
          }),
          runReport(c.refresh_token, c.ga_property_id, {
            dateRanges: [{ startDate: ytdStart, endDate: ytdEnd }],
            dimensions: [{ name: "yearMonth" }],
            metrics: [{ name: "activeUsers" }, { name: "newUsers" }],
            orderBys: [{ dimension: { dimensionName: "yearMonth" } }],
          }),
        ]);



        const totalsRow =
          totals.totals?.[0]?.metricValues ??
          totals.rows?.[0]?.metricValues ??
          [];
        const totalObj: Record<string, number> = {};
        metrics.forEach((m, i) => {
          totalObj[m] = Number(totalsRow[i]?.value ?? 0);
        });


        return {
          id: c.id,
          propertyId: c.ga_property_id,
          label: c.label,
          totals: totalObj,
          timeseries: (timeseries.rows ?? []).map((r) => ({
            date: r.dimensionValues?.[0]?.value ?? "",
            activeUsers: Number(r.metricValues?.[0]?.value ?? 0),
            sessions: Number(r.metricValues?.[1]?.value ?? 0),
          })),
          channels: (channels.rows ?? []).map((r) => ({
            channel: r.dimensionValues?.[0]?.value ?? "(unknown)",
            sessions: Number(r.metricValues?.[0]?.value ?? 0),
            activeUsers: Number(r.metricValues?.[1]?.value ?? 0),
          })),
          topPages: (topPages.rows ?? []).map((r) => ({
            page: r.dimensionValues?.[0]?.value ?? "",
            views: Number(r.metricValues?.[0]?.value ?? 0),
            activeUsers: Number(r.metricValues?.[1]?.value ?? 0),
          })),
          aiSources: (aiSources.rows ?? []).map((r) => ({
            source: r.dimensionValues?.[0]?.value ?? "(unknown)",
            sessions: Number(r.metricValues?.[0]?.value ?? 0),
            activeUsers: Number(r.metricValues?.[1]?.value ?? 0),
          })),
          aiLanding: (aiLanding.rows ?? []).map((r) => ({
            page: r.dimensionValues?.[0]?.value ?? "",
            source: r.dimensionValues?.[1]?.value ?? "",
            sessions: Number(r.metricValues?.[0]?.value ?? 0),
            activeUsers: Number(r.metricValues?.[1]?.value ?? 0),
          })),
          aiMonthly: (() => {
            const map = new Map<number, number>();
            for (const r of aiMonthly.rows ?? []) {
              const ym = r.dimensionValues?.[0]?.value ?? "";
              const m = Number(ym.slice(4, 6));
              if (m >= 1 && m <= 12) {
                map.set(m, (map.get(m) ?? 0) + Number(r.metricValues?.[0]?.value ?? 0));
              }
            }
            const LABELS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
            return Array.from({ length: 12 }, (_, i) => ({
              month: i + 1,
              label: LABELS[i],
              sessions: map.get(i + 1) ?? 0,
            }));
          })(),
          usersMonthly: (() => {
            const mapA = new Map<number, number>();
            const mapN = new Map<number, number>();
            for (const r of usersMonthly.rows ?? []) {
              const ym = r.dimensionValues?.[0]?.value ?? "";
              const m = Number(ym.slice(4, 6));
              if (m >= 1 && m <= 12) {
                mapA.set(m, (mapA.get(m) ?? 0) + Number(r.metricValues?.[0]?.value ?? 0));
                mapN.set(m, (mapN.get(m) ?? 0) + Number(r.metricValues?.[1]?.value ?? 0));
              }
            }
            const LABELS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
            return Array.from({ length: 12 }, (_, i) => ({
              month: i + 1,
              label: LABELS[i],
              activeUsers: mapA.get(i + 1) ?? 0,
              newUsers: mapN.get(i + 1) ?? 0,
            }));
          })(),
          aiYear: refYear,
        };
      } catch (e) {
        return {
          id: c.id,
          propertyId: c.ga_property_id,
          label: c.label,
          error: (e as Error).message,
          totals: {},
          timeseries: [],
          channels: [],
          topPages: [],
          aiSources: [],
          aiLanding: [],
          aiMonthly: [],
          usersMonthly: [],
          aiYear: refYear,
        };

      }

    }),
  );

  return { range: { startDate, endDate }, properties: results };
}

export async function saveOauthConnection(opts: {
  userId: string;
  reportId: string;
  refreshToken: string;
  googleEmail: string | null;
}) {
  await assertAdminGa(opts.userId);
  const { data, error } = await supabaseAdmin
    .from("ga_connections")
    .insert({
      report_id: opts.reportId,
      ga_property_id: "PENDING",
      label: opts.googleEmail ?? "Nova conexão",
      google_email: opts.googleEmail,
      refresh_token: opts.refreshToken,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

import { supabaseAdmin } from "@/integrations/supabase/client.server";

const RD_BASE = "https://api.rd.services";
const RD_OAUTH_ORIGIN = "https://www.dashcompass.com";

export function getRdRedirectUri() {
  return `${RD_OAUTH_ORIGIN}/api/public/rdstation/oauth/callback`;
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
export async function signRdState(payload: Record<string, unknown>): Promise<string> {
  const body = toBase64Url(
    new TextEncoder().encode(JSON.stringify({ ...payload, ts: Date.now() })),
  );
  const sig = toBase64Url(await hmacSha256(stateSecret(), body));
  return `${body}.${sig}`;
}
export async function verifyRdState(state: string): Promise<Record<string, unknown>> {
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

// -- credentials from app_settings --

export async function getAppCredentials(): Promise<{ clientId: string; clientSecret: string }> {
  const { data } = await supabaseAdmin
    .from("app_settings")
    .select("key,value")
    .in("key", ["rdstation_client_id", "rdstation_client_secret"]);
  const map = new Map((data ?? []).map((r) => [r.key, r.value ?? ""]));
  const clientId = map.get("rdstation_client_id") ?? "";
  const clientSecret = map.get("rdstation_client_secret") ?? "";
  if (!clientId || !clientSecret) {
    throw new Error(
      "Credenciais RD Station não configuradas. Vá em Admin → RD Station e informe Client ID + Client Secret.",
    );
  }
  return { clientId, clientSecret };
}

// -- OAuth --

export async function buildRdAuthUrl(reportId: string, userId: string) {
  const { clientId } = await getAppCredentials();
  const state = await signRdState({ reportId, userId });
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getRdRedirectUri(),
    state,
  });
  return `${RD_BASE}/auth/dialog?${params.toString()}`;
}

type RdTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
};

export async function exchangeRdCode(code: string): Promise<RdTokenResponse> {
  const { clientId, clientSecret } = await getAppCredentials();
  const res = await fetch(`${RD_BASE}/auth/token`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
  });
  if (!res.ok) throw new Error(`RD token exchange: ${res.status} ${await res.text()}`);
  return (await res.json()) as RdTokenResponse;
}

export async function refreshRdToken(refreshToken: string): Promise<RdTokenResponse> {
  const { clientId, clientSecret } = await getAppCredentials();
  const res = await fetch(`${RD_BASE}/auth/token`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) throw new Error(`RD refresh: ${res.status} ${await res.text()}`);
  return (await res.json()) as RdTokenResponse;
}

export async function saveRdConnection(opts: {
  reportId: string;
  accountName?: string | null;
  tokens: RdTokenResponse;
}) {
  const expiresAt = new Date(Date.now() + (opts.tokens.expires_in - 60) * 1000).toISOString();
  const { error } = await supabaseAdmin.from("rdstation_connections").upsert(
    {
      report_id: opts.reportId,
      account_name: opts.accountName ?? null,
      access_token: opts.tokens.access_token,
      refresh_token: opts.tokens.refresh_token,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "report_id" },
  );
  if (error) throw new Error(error.message);
}

async function getConnection(reportId: string) {
  const { data, error } = await supabaseAdmin
    .from("rdstation_connections")
    .select("id, report_id, account_name, access_token, refresh_token, expires_at, show_conversions, show_emails")
    .eq("report_id", reportId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

async function getValidAccessToken(reportId: string): Promise<string> {
  const conn = await getConnection(reportId);
  if (!conn) throw new Error("RD Station não conectado para este relatório");
  const expiresAt = new Date(conn.expires_at).getTime();
  if (expiresAt - Date.now() > 60_000) return conn.access_token;
  const t = await refreshRdToken(conn.refresh_token);
  await supabaseAdmin
    .from("rdstation_connections")
    .update({
      access_token: t.access_token,
      refresh_token: t.refresh_token ?? conn.refresh_token,
      expires_at: new Date(Date.now() + (t.expires_in - 60) * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", conn.id);
  return t.access_token;
}

async function rdFetch<T>(reportId: string, path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${RD_BASE}${path}`);
  if (params) for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  let token = await getValidAccessToken(reportId);
  let res = await fetch(url.toString(), { headers: { authorization: `Bearer ${token}` } });
  if (res.status === 401) {
    // Force refresh once and retry
    const conn = await getConnection(reportId);
    if (conn) {
      const t = await refreshRdToken(conn.refresh_token);
      await supabaseAdmin
        .from("rdstation_connections")
        .update({
          access_token: t.access_token,
          refresh_token: t.refresh_token ?? conn.refresh_token,
          expires_at: new Date(Date.now() + (t.expires_in - 60) * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", conn.id);
      token = t.access_token;
      res = await fetch(url.toString(), { headers: { authorization: `Bearer ${token}` } });
    }
  }
  if (!res.ok) {
    const body = await res.text();
    if (res.status === 401 || res.status === 403) {
      throw new Error(
        `Sem permissão do RD Station para ${path}. O App OAuth precisa ter o escopo/aprovação "Analytics" habilitado pelo RD Station, e a conta cliente precisa estar em plano que inclua esse recurso.`,
      );
    }
    if (res.status === 429) {
      throw new Error("Limite de requisições do RD Station atingido. Tente novamente em alguns minutos.");
    }
    throw new Error(`RD ${path}: ${res.status} ${body}`);
  }
  const json = await res.json();
  try {
    console.log(`[RD] ${path} ${JSON.stringify(params ?? {})} →`, JSON.stringify(json).slice(0, 2000));
  } catch {}
  return json as T;
}

// -- Admin helpers --

export async function assertAdminRd(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Forbidden: admin only");
}

export async function listRdConnectionsImpl(reportId: string) {
  const { data, error } = await supabaseAdmin
    .from("rdstation_connections")
    .select("id, account_name, expires_at, created_at, updated_at, show_conversions, show_emails")
    .eq("report_id", reportId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function deleteRdConnectionImpl(id: string) {
  const { error } = await supabaseAdmin.from("rdstation_connections").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function updateRdConnectionSettingsImpl(
  id: string,
  patch: { show_conversions?: boolean; show_emails?: boolean },
) {
  const { error } = await supabaseAdmin
    .from("rdstation_connections")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true };
}


// -- Metrics --

export type RdMetricsRange = "7d" | "28d" | "90d" | "thisMonth" | "lastMonth";

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };
type JsonRecord = Record<string, Json>;

function rangeToDates(range: RdMetricsRange): { start_date: string; end_date: string } {
  const today = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  if (range === "thisMonth") {
    const s = new Date(today.getFullYear(), today.getMonth(), 1);
    return { start_date: iso(s), end_date: iso(today) };
  }
  if (range === "lastMonth") {
    const s = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const e = new Date(today.getFullYear(), today.getMonth(), 0);
    return { start_date: iso(s), end_date: iso(e) };
  }
  const days = range === "7d" ? 7 : range === "28d" ? 28 : 90;
  const s = new Date(today);
  s.setDate(s.getDate() - days + 1);
  return { start_date: iso(s), end_date: iso(today) };
}

function asRecordArray(value: unknown, key: string): JsonRecord[] {
  if (!value || typeof value !== "object") return [];
  const list = (value as Record<string, unknown>)[key];
  if (!Array.isArray(list)) return [];
  return list.filter((item): item is JsonRecord => !!item && typeof item === "object") as JsonRecord[];
}

function campaignKey(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}

function datePart(value: unknown): string | null {
  if (typeof value !== "string" || value.length < 10) return null;
  return value.slice(0, 10);
}

function isDateInRange(value: unknown, startDate: string, endDate: string): boolean {
  const d = datePart(value);
  return !!d && d >= startDate && d <= endDate;
}

async function listRdEmailsInRange(reportId: string, startDate: string, endDate: string): Promise<JsonRecord[]> {
  const byId = new Map<string, JsonRecord>();
  const pageSize = 100;
  let total = Number.POSITIVE_INFINITY;

  for (let page = 1; page <= 20 && (page - 1) * pageSize < total; page += 1) {
    const payload = await rdFetch<{ total?: number; items?: JsonRecord[] }>(reportId, "/platform/emails", {
      page: String(page),
      page_size: String(pageSize),
    });
    total = typeof payload.total === "number" ? payload.total : total;
    const items = Array.isArray(payload.items) ? payload.items : [];
    if (items.length === 0) break;

    for (const item of items) {
      if (!isDateInRange(item.send_at, startDate, endDate)) continue;
      const id = campaignKey(item.id) ?? campaignKey(item.campaign_id);
      if (!id) continue;
      byId.set(id, item);
    }
  }

  return Array.from(byId.values()).sort((a, b) => String(b.send_at ?? "").localeCompare(String(a.send_at ?? "")));
}

function mergeRdEmailData(analytics: unknown, listedEmails: JsonRecord[]): JsonRecord {
  const analyticsRecords = asRecordArray(analytics, "emails");
  const metadataByCampaign = new Map<string, JsonRecord>();
  const usedCampaigns = new Set<string>();

  for (const item of listedEmails) {
    const id = campaignKey(item.campaign_id);
    if (id) metadataByCampaign.set(id, item);
  }

  const emails: JsonRecord[] = analyticsRecords.map((rec) => {
    const id = campaignKey(rec.campaign_id);
    const meta = id ? metadataByCampaign.get(id) : undefined;
    if (id) usedCampaigns.add(id);
    return {
      ...(meta ?? {}),
      ...rec,
      email_id: meta?.id ?? rec.email_id ?? null,
      campaign_id: rec.campaign_id ?? meta?.campaign_id ?? null,
      campaign_name: rec.campaign_name ?? meta?.name ?? null,
      send_at: rec.send_at ?? meta?.send_at ?? null,
      status: meta?.status ?? rec.status ?? null,
      leads_count: meta?.leads_count ?? rec.leads_count ?? rec.contacts_count ?? null,
      behavior_score_info: meta?.behavior_score_info ?? rec.behavior_score_info ?? null,
    } satisfies JsonRecord;
  });

  for (const item of listedEmails) {
    const id = campaignKey(item.campaign_id);
    if (id && usedCampaigns.has(id)) continue;
    emails.push({
      ...item,
      email_id: item.id ?? null,
      campaign_name: item.name ?? null,
      contacts_count: item.leads_count ?? null,
      rd_analytics_missing: true,
    });
  }

  if (analytics && typeof analytics === "object" && !Array.isArray(analytics)) {
    return { ...(analytics as JsonRecord), emails };
  }
  return { emails };
}

async function getRdEmailsPayload(reportId: string, params: { start_date: string; end_date: string }): Promise<JsonRecord> {
  const [analyticsResult, listedResult] = await Promise.allSettled([
    rdFetch<unknown>(reportId, "/platform/analytics/emails", params),
    listRdEmailsInRange(reportId, params.start_date, params.end_date),
  ]);

  if (analyticsResult.status === "fulfilled") {
    const listedEmails = listedResult.status === "fulfilled" ? listedResult.value : [];
    return mergeRdEmailData(analyticsResult.value, listedEmails);
  }

  if (listedResult.status === "fulfilled") {
    return mergeRdEmailData(null, listedResult.value);
  }

  throw analyticsResult.reason;
}

export async function getRdMetricsImpl(
  reportId: string,
  range: RdMetricsRange = "28d",
  customDates?: { start_date: string; end_date: string },
) {
  const conn = await getConnection(reportId);
  if (!conn) return { connected: false as const };

  const { start_date, end_date } = customDates ?? rangeToDates(range);
  const params = { start_date, end_date };

  const showConversions = conn.show_conversions !== false;
  const showEmails = conn.show_emails !== false;

  type Settled = { data: Json | null; error: string | null };
  const settle = (r: PromiseSettledResult<unknown>): Settled =>
    r.status === "fulfilled"
      ? { data: JSON.parse(JSON.stringify(r.value)) as Json, error: null }
      : { data: null, error: (r.reason as Error)?.message ?? "erro" };

  const [conversions, emails] = await Promise.allSettled([
    showConversions
      ? rdFetch<unknown>(reportId, "/platform/analytics/conversions", params)
      : Promise.reject(new Error("disabled")),
    showEmails
      ? getRdEmailsPayload(reportId, params)
      : Promise.reject(new Error("disabled")),
  ]);

  return {
    connected: true as const,
    accountName: conn.account_name,
    range: { start_date, end_date },
    showConversions,
    showEmails,
    conversions: settle(conversions),
    emails: settle(emails),
  };
}

import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Chaves de acesso MCP ("link já autenticado").
 *
 * A chave em si NUNCA é armazenada: guardamos apenas o SHA-256. O valor bruto
 * é exibido uma única vez, no momento da criação.
 *
 * Escopo: a chave herda exatamente as permissões do usuário que a criou
 * (admin de agência) — as tools continuam consultando o banco com um token
 * real daquele usuário, então a RLS segue valendo.
 */

const KEY_PREFIX = "dcmcp_";

export type McpKeyRow = {
  id: string;
  label: string;
  token_prefix: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
};

/* ------------------------------- helpers ------------------------------- */

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  return toHex(await crypto.subtle.digest("SHA-256", data));
}

function generateRawKey(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return KEY_PREFIX + toHex(bytes.buffer);
}

type CallerContext = { isGlobal: boolean; agencyId: string | null };

async function getCallerContext(callerId: string): Promise<CallerContext> {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role, agency_id")
    .eq("user_id", callerId);

  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const isGlobal = rows.some((r) => r.role === "admin" || r.role === "admin_global");
  const isAgencyAdmin = rows.some((r) => r.role === "admin_agencia");
  if (!isGlobal && !isAgencyAdmin) throw new Error("Forbidden: admin only");

  return { isGlobal, agencyId: rows.find((r) => r.agency_id)?.agency_id ?? null };
}

/* ------------------------------ CRUD (admin) ---------------------------- */

export async function listMcpKeysImpl(callerId: string): Promise<McpKeyRow[]> {
  await getCallerContext(callerId);

  const { data, error } = await supabaseAdmin
    .from("mcp_access_tokens")
    .select("id, label, token_prefix, created_at, last_used_at, revoked_at")
    .eq("user_id", callerId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as McpKeyRow[];
}

export async function createMcpKeyImpl(callerId: string, label: string) {
  const caller = await getCallerContext(callerId);

  const raw = generateRawKey();
  const token_hash = await sha256Hex(raw);
  // Prefixo visível para o admin identificar a chave depois (não é secreto).
  const token_prefix = raw.slice(0, KEY_PREFIX.length + 6);

  const { data, error } = await supabaseAdmin
    .from("mcp_access_tokens")
    .insert({
      user_id: callerId,
      agency_id: caller.agencyId,
      label: label.trim() || "Chave MCP",
      token_hash,
      token_prefix,
    })
    .select("id, label, token_prefix, created_at, last_used_at, revoked_at")
    .single();

  if (error) throw new Error(error.message);

  // `key` só existe nesta resposta — nunca mais será recuperável.
  return { row: data as McpKeyRow, key: raw };
}

export async function revokeMcpKeyImpl(callerId: string, id: string) {
  await getCallerContext(callerId);

  const { error } = await supabaseAdmin
    .from("mcp_access_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", callerId);

  if (error) throw new Error(error.message);
  return { ok: true };
}

/* --------------------- resolução da chave no endpoint ------------------- */

/** Access tokens Supabase valem ~1h; guardamos por 45min para evitar re-mint. */
const tokenCache = new Map<string, { token: string; expiresAt: number }>();

function publishableClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase env ausente");

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input: RequestInfo | URL, init?: RequestInit) => {
        const headers = new Headers(init?.headers);
        // Chaves sb_* são opacas, não JWTs: só o header apikey é válido.
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

/**
 * Gera um access token real do Supabase para o dono da chave, para que as
 * tools continuem consultando o banco sob a RLS daquele usuário.
 */
async function mintAccessToken(userId: string): Promise<string> {
  const cached = tokenCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) return cached.token;

  const { data: userRes, error: userErr } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (userErr || !userRes?.user?.email) {
    throw new Error("Não foi possível resolver o usuário da chave.");
  }

  const { data: link, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email: userRes.user.email,
  });
  if (linkErr || !link?.properties?.hashed_token) {
    throw new Error(linkErr?.message ?? "Falha ao gerar sessão para a chave.");
  }

  const { data: session, error: otpErr } = await publishableClient().auth.verifyOtp({
    type: "magiclink",
    token_hash: link.properties.hashed_token,
  });
  if (otpErr || !session?.session?.access_token) {
    throw new Error(otpErr?.message ?? "Falha ao validar sessão para a chave.");
  }

  const token = session.session.access_token;
  tokenCache.set(userId, { token, expiresAt: Date.now() + 45 * 60 * 1000 });
  return token;
}

export type ResolvedKey = { userId: string; email: string | undefined; accessToken: string };

/** Valida a chave crua e devolve identidade + token de acesso, ou null. */
export async function resolveMcpKey(rawKey: string): Promise<ResolvedKey | null> {
  if (!rawKey || !rawKey.startsWith(KEY_PREFIX)) return null;

  const token_hash = await sha256Hex(rawKey);
  const { data, error } = await supabaseAdmin
    .from("mcp_access_tokens")
    .select("id, user_id, revoked_at")
    .eq("token_hash", token_hash)
    .maybeSingle();

  if (error || !data || data.revoked_at) return null;

  // Uso registrado de forma não bloqueante.
  void supabaseAdmin
    .from("mcp_access_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id)
    .then(() => undefined);

  const accessToken = await mintAccessToken(data.user_id);
  const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(data.user_id);

  return { userId: data.user_id, email: userRes?.user?.email ?? undefined, accessToken };
}

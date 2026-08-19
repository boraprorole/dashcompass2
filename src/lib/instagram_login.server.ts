import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { signMetaState, verifyMetaState } from "@/lib/meta.server";

const IG_OAUTH_ORIGIN = "https://www.dashcompass.com";
const IG_GRAPH = "https://graph.instagram.com";
const IG_GRAPH_VERSION = "v23.0";

/**
 * "Instagram API com login empresarial" — fluxo independente do Facebook Login.
 * O token resultante é usado em graph.instagram.com (não em graph.facebook.com).
 */
export const INSTAGRAM_LOGIN_SCOPES = [
  "instagram_business_basic",
  "instagram_business_manage_insights",
].join(",");

export const INSTAGRAM_LOGIN_SCOPE_TAG = "instagram_login";

export function getInstagramRedirectUri() {
  return `${IG_OAUTH_ORIGIN}/api/public/instagram/oauth/callback`;
}

function getCredentials(): { appId: string; appSecret: string } {
  const appId = process.env.INSTAGRAM_APP_ID ?? "";
  const appSecret = process.env.INSTAGRAM_APP_SECRET ?? "";
  if (!appId || !appSecret) {
    throw new Error(
      "INSTAGRAM_APP_ID / INSTAGRAM_APP_SECRET não configurados nos secrets do projeto.",
    );
  }
  return { appId, appSecret };
}

export async function buildInstagramAuthUrl(reportId: string, userId: string) {
  const { appId } = getCredentials();
  const state = await signMetaState({ reportId, userId, provider: "instagram_login" });
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: getInstagramRedirectUri(),
    response_type: "code",
    scope: INSTAGRAM_LOGIN_SCOPES,
    state,
  });
  return `https://www.instagram.com/oauth/authorize?${params.toString()}`;
}

export async function verifyInstagramState(state: string) {
  const parsed = (await verifyMetaState(state)) as { reportId?: string; userId?: string };
  if (!parsed.reportId || !parsed.userId) throw new Error("state inválido");
  return { reportId: parsed.reportId, userId: parsed.userId };
}

type ShortToken = { access_token: string; user_id: number | string; permissions?: string };
type LongToken = { access_token: string; token_type: string; expires_in: number };

export async function exchangeInstagramCode(rawCode: string): Promise<ShortToken> {
  const { appId, appSecret } = getCredentials();
  // O Instagram devolve o code com o sufixo "#_" — precisa ser removido.
  const code = rawCode.replace(/#_$/, "");
  const body = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    grant_type: "authorization_code",
    redirect_uri: getInstagramRedirectUri(),
    code,
  });
  const res = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Instagram token exchange: ${res.status} ${text}`);
  return JSON.parse(text) as ShortToken;
}

export async function exchangeInstagramLongLived(shortToken: string): Promise<LongToken> {
  const { appSecret } = getCredentials();
  const params = new URLSearchParams({
    grant_type: "ig_exchange_token",
    client_secret: appSecret,
    access_token: shortToken,
  });
  const res = await fetch(`${IG_GRAPH}/access_token?${params.toString()}`);
  const text = await res.text();
  if (!res.ok) throw new Error(`Instagram long-lived exchange: ${res.status} ${text}`);
  return JSON.parse(text) as LongToken;
}

export type InstagramMe = {
  user_id: string;
  username?: string;
  name?: string;
  profile_picture_url?: string;
};

export async function getInstagramMe(accessToken: string): Promise<InstagramMe> {
  const res = await fetch(
    `${IG_GRAPH}/${IG_GRAPH_VERSION}/me?fields=user_id,username,name,profile_picture_url&access_token=${encodeURIComponent(accessToken)}`,
  );
  const text = await res.text();
  if (!res.ok) throw new Error(`Instagram /me: ${res.status} ${text}`);
  const json = JSON.parse(text) as InstagramMe & { id?: string };
  const userId = json.user_id ?? json.id;
  if (!userId) throw new Error("Instagram /me não retornou user_id");
  return { ...json, user_id: String(userId) };
}

/**
 * Persiste a conexão na mesma tabela do Meta para reaproveitar seleção de
 * ativos, cache e as ferramentas de relatório/MCP já existentes.
 * A Página do Facebook fica vazia — só o perfil do Instagram é publicado.
 */
export async function saveInstagramConnection(opts: {
  reportId: string;
  userId: string;
  longToken: LongToken;
  me: InstagramMe;
}) {
  const igId = opts.me.user_id;
  const pseudoPageId = `ig_login:${igId}`;
  const expiresAt = new Date(
    Date.now() + (opts.longToken.expires_in ?? 60 * 24 * 60 * 60) * 1000,
  ).toISOString();

  const discovered = {
    pages: [
      {
        id: pseudoPageId,
        name: opts.me.username ? `@${opts.me.username}` : "Instagram",
        instagram: { id: igId, username: opts.me.username, name: opts.me.name },
      },
    ],
    ad_accounts: [],
  };

  const { error } = await supabaseAdmin.from("meta_connections").insert({
    report_id: opts.reportId,
    connected_by: opts.userId,
    fb_user_id: igId,
    fb_user_name: opts.me.username ? `@${opts.me.username}` : (opts.me.name ?? "Instagram"),
    access_token: opts.longToken.access_token,
    token_expires_at: expiresAt,
    scope: `${INSTAGRAM_LOGIN_SCOPE_TAG},${INSTAGRAM_LOGIN_SCOPES}`,
    discovered_pages: discovered as unknown as never,
    // Somente o Instagram é selecionado: não existe Página do Facebook aqui.
    selected_assets: { pages: [], instagrams: [igId], ad_accounts: [] } as unknown as never,
  });
  if (error) throw new Error(error.message);

  await supabaseAdmin.from("windsor_cache").delete().eq("report_id", opts.reportId);
}

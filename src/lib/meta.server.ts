import { supabaseAdmin } from "@/integrations/supabase/client.server";

const FB_GRAPH_VERSION = "v25.0";
const FB_OAUTH_ORIGIN = "https://www.dashcompass.com";

// Scopes: Instagram Insights + Facebook Pages + Meta Ads (read)
export const META_SCOPES = [
  "public_profile",
  "email",
  "pages_show_list",
  "pages_read_engagement",
  "read_insights",
  "instagram_basic",
  "instagram_manage_insights",
  "ads_read",
  "business_management",
].join(",");

export function getMetaRedirectUri() {
  return `${FB_OAUTH_ORIGIN}/api/public/meta/oauth/callback`;
}

function getCredentials(): { appId: string; appSecret: string } {
  const appId = process.env.META_APP_ID ?? "";
  const appSecret = process.env.META_APP_SECRET ?? "";
  if (!appId || !appSecret) {
    throw new Error(
      "META_APP_ID / META_APP_SECRET não configurados nos secrets do projeto.",
    );
  }
  return { appId, appSecret };
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

export async function signMetaState(payload: Record<string, unknown>): Promise<string> {
  const body = toBase64Url(
    new TextEncoder().encode(JSON.stringify({ ...payload, ts: Date.now() })),
  );
  const sig = toBase64Url(await hmacSha256(stateSecret(), body));
  return `${body}.${sig}`;
}
export async function verifyMetaState(state: string): Promise<Record<string, unknown>> {
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
export async function buildMetaAuthUrl(reportId: string, userId: string) {
  const { appId } = getCredentials();
  const state = await signMetaState({ reportId, userId });
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: getMetaRedirectUri(),
    state,
    scope: META_SCOPES,
    response_type: "code",
  });
  return `https://www.facebook.com/${FB_GRAPH_VERSION}/dialog/oauth?${params.toString()}`;
}

type ShortLivedToken = { access_token: string; token_type: string; expires_in?: number };
type LongLivedToken = { access_token: string; token_type: string; expires_in: number };

export async function exchangeMetaCode(code: string): Promise<ShortLivedToken> {
  const { appId, appSecret } = getCredentials();
  const params = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: getMetaRedirectUri(),
    code,
  });
  const res = await fetch(
    `https://graph.facebook.com/${FB_GRAPH_VERSION}/oauth/access_token?${params.toString()}`,
  );
  if (!res.ok) throw new Error(`Meta token exchange: ${res.status} ${await res.text()}`);
  return (await res.json()) as ShortLivedToken;
}

export async function exchangeForLongLivedToken(shortToken: string): Promise<LongLivedToken> {
  const { appId, appSecret } = getCredentials();
  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: shortToken,
  });
  const res = await fetch(
    `https://graph.facebook.com/${FB_GRAPH_VERSION}/oauth/access_token?${params.toString()}`,
  );
  if (!res.ok) throw new Error(`Meta long-lived exchange: ${res.status} ${await res.text()}`);
  return (await res.json()) as LongLivedToken;
}

type MeResponse = { id: string; name: string };
export async function getFacebookMe(accessToken: string): Promise<MeResponse> {
  const res = await fetch(
    `https://graph.facebook.com/${FB_GRAPH_VERSION}/me?fields=id,name&access_token=${encodeURIComponent(accessToken)}`,
  );
  if (!res.ok) throw new Error(`Meta /me: ${res.status} ${await res.text()}`);
  return (await res.json()) as MeResponse;
}

type PageEntry = {
  id: string;
  name: string;
  business_id?: string;
  access_token?: string;
  instagram_business_account?: { id: string; username?: string; name?: string };
};

async function graphList<T>(url: string, maxPages = 8): Promise<T[]> {
  const out: T[] = [];
  let next: string | null = url;
  let pages = 0;
  while (next && pages < maxPages) {
    const res = await fetch(next);
    if (!res.ok) throw new Error(`Meta Graph: ${res.status} ${await res.text()}`);
    const json = (await res.json()) as { data?: T[]; paging?: { next?: string } };
    out.push(...(json.data ?? []));
    next = json.paging?.next ?? null;
    pages++;
  }
  return out;
}

function pageFields() {
  return "id,name,access_token,instagram_business_account{id,username,name}";
}

export async function listUserPages(
  accessToken: string,
  businessIds: Set<string> = new Set(),
): Promise<PageEntry[]> {
  const token = encodeURIComponent(accessToken);
  const byId = new Map<string, PageEntry>();
  const add = (p: PageEntry, businessId?: string) => {
    if (!p.id) return;
    byId.set(p.id, { ...byId.get(p.id), ...p, business_id: businessId ?? p.business_id });
  };

  // Páginas atribuídas diretamente ao usuário.
  try {
    const pages = await graphList<PageEntry>(
      `https://graph.facebook.com/${FB_GRAPH_VERSION}/me/accounts?fields=${pageFields()}&limit=100&access_token=${token}`,
    );
    for (const p of pages) add(p);
  } catch {
    // Em Login for Business algumas páginas só aparecem pelas bordas do Business.
  }

  // Quando o diálogo libera uma Empresa/Business, as Páginas podem não aparecer em /me/accounts.
  // Buscar owned_pages/client_pages dos Businesses efetivamente liberados evita perder Página/Instagram.
  for (const businessId of businessIds) {
    for (const edge of ["owned_pages", "client_pages"] as const) {
      try {
        const pages = await graphList<PageEntry>(
          `https://graph.facebook.com/${FB_GRAPH_VERSION}/${businessId}/${edge}?fields=${pageFields()}&limit=100&access_token=${token}`,
        );
        for (const p of pages) add(p, businessId);
      } catch {
        // Sem permissão nessa borda específica — tenta a próxima.
      }
    }
  }

  return Array.from(byId.values());
}

async function getPageById(accessToken: string, pageId: string): Promise<PageEntry | null> {
  try {
    const res = await fetch(
      `https://graph.facebook.com/${FB_GRAPH_VERSION}/${encodeURIComponent(pageId)}?fields=${pageFields()}&access_token=${encodeURIComponent(accessToken)}`,
    );
    if (!res.ok) return null;
    const page = (await res.json()) as PageEntry;
    return page?.id ? page : null;
  } catch {
    return null;
  }
}

type AdAccount = {
  id: string;
  account_id: string;
  name?: string;
  currency?: string;
  business_id?: string;
};
export async function listUserAdAccounts(
  accessToken: string,
  businessIds: Set<string> = new Set(),
): Promise<AdAccount[]> {
  const token = encodeURIComponent(accessToken);
  const byId = new Map<string, AdAccount>();
  const add = (a: AdAccount, businessId?: string) => {
    if (!a?.id) return;
    byId.set(a.id, { ...byId.get(a.id), ...a, business_id: businessId ?? a.business_id });
  };

  try {
    const res = await fetch(
      `https://graph.facebook.com/${FB_GRAPH_VERSION}/me/adaccounts?fields=id,account_id,name,currency&limit=100&access_token=${token}`,
    );
    if (res.ok) {
      const json = (await res.json()) as { data?: AdAccount[] };
      for (const a of json.data ?? []) add(a);
    }
  } catch {
    // ads_read pode não estar aprovado — segue para bordas de Business.
  }

  // Login for Business: quando o usuário libera uma Empresa com Ads,
  // as contas de anúncios costumam aparecer só nas bordas do Business.
  for (const businessId of businessIds) {
    for (const edge of ["owned_ad_accounts", "client_ad_accounts"] as const) {
      try {
        const accounts = await graphList<AdAccount>(
          `https://graph.facebook.com/${FB_GRAPH_VERSION}/${businessId}/${edge}?fields=id,account_id,name,currency&limit=100&access_token=${token}`,
        );
        for (const a of accounts) add(a, businessId);
      } catch {
        // Sem permissão nessa borda — tenta a próxima.
      }
    }
  }

  return Array.from(byId.values());
}

// Retorna os IDs dos ativos efetivamente liberados no diálogo do OAuth
// (asset selection do "Login for Business"). Cada scope pode ter target_ids
// específicos — sem essa filtragem, /me/adaccounts retorna TODAS as contas
// às quais o usuário tem acesso, não apenas as que ele autorizou este app a ler.
export async function getGrantedTargetIds(
  userAccessToken: string,
): Promise<{
  pageIds: Set<string> | null;
  adAccountIds: Set<string> | null;
  businessIds: Set<string>;
}> {
  const { appId, appSecret } = getCredentials();
  const appToken = `${appId}|${appSecret}`;
  const url = `https://graph.facebook.com/${FB_GRAPH_VERSION}/debug_token?input_token=${encodeURIComponent(userAccessToken)}&access_token=${encodeURIComponent(appToken)}`;
  const res = await fetch(url);
  if (!res.ok) return { pageIds: new Set(), adAccountIds: new Set(), businessIds: new Set() };
  const json = (await res.json()) as {
    data?: {
      scopes?: string[];
      granular_scopes?: Array<{ scope: string; target_ids?: string[] }>;
    };
  };
  const gs = json.data?.granular_scopes ?? [];
  const scopes = json.data?.scopes ?? [];
  // Se o usuário NÃO concedeu nenhum scope dessa família, devolve Set vazio
  // (filtra tudo). Antes retornávamos null (=mostrar tudo), o que expunha
  // 55 contas de anúncios sem autorização. Se concedeu com target_ids,
  // filtra por eles. Se concedeu sem asset selection, retorna null (amplo).
  const collect = (family: string[], allowUnrestricted: boolean): Set<string> | null => {
    const grantedInFamily = family.some((s) => scopes.includes(s));
    const granularMatches = gs.filter((g) => family.includes(g.scope));
    if (!grantedInFamily && granularMatches.length === 0) return new Set();
    const ids = new Set<string>();
    let sawUnrestricted = false;
    for (const g of granularMatches) {
      if (!g.target_ids || g.target_ids.length === 0) {
        sawUnrestricted = true;
        continue;
      }
      for (const id of g.target_ids) ids.add(id);
    }
    if (granularMatches.length === 0) return allowUnrestricted ? null : new Set();
    if (sawUnrestricted && ids.size === 0) return allowUnrestricted ? null : new Set();
    return ids;
  };
  const businessIds = collect(["business_management"], false) ?? new Set<string>();
  return {
    pageIds: collect([
      "pages_show_list",
      "pages_read_engagement",
      "pages_manage_metadata",
      "pages_read_user_content",
      "pages_manage_posts",
      "pages_manage_engagement",
    ], true),
    // Segurança: se o Meta não devolve target_ids granulares para Ads, não tratamos como
    // "tudo liberado". Isso evita listar todas as contas de anúncio do usuário.
    adAccountIds: collect(["ads_read", "ads_management"], false),
    businessIds,
  };
}

function emptySelection(): MetaSelectedAssets {
  return { pages: [], instagrams: [], ad_accounts: [] };
}

function hasSelectedAssets(selection: MetaSelectedAssets): boolean {
  return selection.pages.length > 0 || selection.instagrams.length > 0 || selection.ad_accounts.length > 0;
}

function isDiscoveredEmpty(discovered: DiscoveredPages | null | undefined): boolean {
  return (discovered?.pages?.length ?? 0) === 0 && (discovered?.ad_accounts?.length ?? 0) === 0;
}

function addPageOnce(map: Map<string, PageEntry>, page: PageEntry) {
  if (!page.id) return;
  map.set(page.id, { ...map.get(page.id), ...page });
}

function addAdOnce(map: Map<string, AdAccount>, ad: AdAccount) {
  if (!ad.account_id) return;
  map.set(ad.account_id, { ...map.get(ad.account_id), ...ad });
}

export async function discoverMetaAssets(accessToken: string): Promise<{
  discovered: DiscoveredPages;
  preSelected: MetaSelectedAssets;
}> {
  const granted = await getGrantedTargetIds(accessToken);
  const [allPages, allAdAccounts] = await Promise.all([
    listUserPages(accessToken, granted.businessIds),
    listUserAdAccounts(accessToken, granted.businessIds),
  ]);

  const pagesById = new Map<string, PageEntry>();
  const exactPages: PageEntry[] = [];
  const pageIds = granted.pageIds;
  if (pageIds === null) {
    // Unrestricted grant: keep the assets available in the selector, but do not
    // auto-publish all of them to the report.
    for (const page of allPages) addPageOnce(pagesById, page);
  } else {
    for (const page of allPages) {
      if (pageIds.has(page.id)) {
        exactPages.push(page);
        addPageOnce(pagesById, page);
      }
    }
    const missingPageIds = Array.from(pageIds).filter((id) => !pagesById.has(id));
    const directPages = await Promise.all(missingPageIds.map((id) => getPageById(accessToken, id)));
    for (const page of directPages) {
      if (!page) continue;
      exactPages.push(page);
      addPageOnce(pagesById, page);
    }
  }

  // Some Login for Business responses expose only the Business ID in granular
  // scopes. Use that only for discovery (so the app selector can show the
  // assets), not as automatic report selection.
  for (const page of allPages) {
    if (page.business_id && granted.businessIds.has(page.business_id)) {
      addPageOnce(pagesById, page);
    }
  }

  const adsByAccountId = new Map<string, AdAccount>();
  const exactAds: AdAccount[] = [];
  const adIds = granted.adAccountIds;
  if (adIds === null) {
    for (const ad of allAdAccounts) addAdOnce(adsByAccountId, ad);
  } else {
    for (const ad of allAdAccounts) {
      if (adIds.has(ad.account_id) || adIds.has(ad.id)) {
        exactAds.push(ad);
        addAdOnce(adsByAccountId, ad);
      }
    }
  }
  for (const ad of allAdAccounts) {
    if (ad.business_id && granted.businessIds.has(ad.business_id)) {
      addAdOnce(adsByAccountId, ad);
    }
  }

  const discovered: DiscoveredPages = {
    pages: Array.from(pagesById.values()).map((p) => ({
      id: p.id,
      name: p.name,
      business_id: p.business_id,
      instagram: p.instagram_business_account
        ? {
            id: p.instagram_business_account.id,
            username: p.instagram_business_account.username,
            name: p.instagram_business_account.name,
          }
        : null,
    })),
    ad_accounts: Array.from(adsByAccountId.values()).map((a) => ({
      id: a.id,
      account_id: a.account_id,
      name: a.name,
      currency: a.currency,
    })),
  };

  const preSelected: MetaSelectedAssets = {
    pages: exactPages.map((p) => p.id),
    instagrams: exactPages
      .map((p) => p.instagram_business_account?.id)
      .filter((v): v is string => !!v),
    ad_accounts: exactAds.map((a) => a.account_id),
  };

  // When Meta returns only the authorized Business ID (common in Login for
  // Business) and that Business exposes a single Page/Instagram, safely select
  // it so the dashboard updates immediately instead of staying empty.
  if (preSelected.pages.length === 0 && discovered.pages.length === 1) {
    const onlyPage = discovered.pages[0];
    preSelected.pages = [onlyPage.id];
    preSelected.instagrams = onlyPage.instagram ? [onlyPage.instagram.id] : [];
  }

  return { discovered, preSelected };
}

export async function refreshMetaConnectionAssetsIfEmpty<T extends {
  id: string;
  access_token: string;
  discovered_pages: DiscoveredPages | null;
  selected_assets?: MetaSelectedAssets | null;
}>(row: T): Promise<T> {
  if (!isDiscoveredEmpty(row.discovered_pages)) return row;
  const discovery = await discoverMetaAssets(row.access_token);
  if (isDiscoveredEmpty(discovery.discovered)) return row;

  const currentSelection = row.selected_assets ?? emptySelection();
  const shouldRepairSelection = !hasSelectedAssets(currentSelection) && hasSelectedAssets(discovery.preSelected);
  const nextSelection = shouldRepairSelection ? discovery.preSelected : row.selected_assets;

  await supabaseAdmin
    .from("meta_connections")
    .update({
      discovered_pages: discovery.discovered as unknown as never,
      ...(shouldRepairSelection ? { selected_assets: discovery.preSelected as unknown as never } : {}),
    })
    .eq("id", row.id);

  await supabaseAdmin.from("windsor_cache").delete().eq("report_id", (row as { report_id?: string }).report_id ?? "");

  return {
    ...row,
    discovered_pages: discovery.discovered,
    selected_assets: nextSelection,
  };
}

export type DiscoveredPages = {
  pages: Array<{
    id: string;
    name: string;
    business_id?: string;
    instagram: { id: string; username?: string; name?: string } | null;
  }>;
  ad_accounts: Array<{ id: string; account_id: string; name?: string; currency?: string }>;
};

export type MetaSelectedAssets = {
  pages: string[];
  instagrams: string[];
  ad_accounts: string[];
};

export async function saveMetaConnection(opts: {
  reportId: string;
  userId: string;
  longToken: LongLivedToken;
  fbUser: MeResponse;
  discovered: DiscoveredPages;
  selection?: MetaSelectedAssets;
}) {
  const expiresAt = new Date(
    Date.now() + (opts.longToken.expires_in ?? 60 * 24 * 60 * 60) * 1000,
  ).toISOString();

  const preSelected = opts.selection ?? emptySelection();

  const { error } = await supabaseAdmin.from("meta_connections").insert({
    report_id: opts.reportId,
    connected_by: opts.userId,
    fb_user_id: opts.fbUser.id,
    fb_user_name: opts.fbUser.name,
    access_token: opts.longToken.access_token,
    token_expires_at: expiresAt,
    scope: META_SCOPES,
    discovered_pages: opts.discovered as unknown as never,
    selected_assets: preSelected as unknown as never,
  });
  if (error) throw new Error(error.message);

  // Invalida cache do relatório para os novos ativos aparecerem imediatamente.
  await supabaseAdmin.from("windsor_cache").delete().eq("report_id", opts.reportId);
}



// -- helpers usados nas server functions --

export async function assertCanManageReport(userId: string, reportId: string) {
  const { data: adminRole } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "admin_global", "admin_agencia"])
    .limit(1)
    .maybeSingle();
  if (adminRole) return;

  const { data: conexoesRole } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "conexoes")
    .maybeSingle();
  if (!conexoesRole) throw new Error("Forbidden");

  const { data: report } = await supabaseAdmin
    .from("reports")
    .select("company_id")
    .eq("id", reportId)
    .maybeSingle();
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("company_id")
    .eq("id", userId)
    .maybeSingle();
  if (!report?.company_id || report.company_id !== profile?.company_id) {
    throw new Error("Forbidden: report não pertence à sua empresa");
  }
}

export async function listMetaConnectionsImpl(userId: string, reportId: string) {
  await assertCanManageReport(userId, reportId);
  const { data, error } = await supabaseAdmin
    .from("meta_connections")
    .select(
      "id, report_id, fb_user_name, fb_user_id, access_token, token_expires_at, scope, discovered_pages, selected_assets, created_at",
    )
    .eq("report_id", reportId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  type MetaConnectionListRow = {
    id: string;
    report_id: string;
    fb_user_name: string | null;
    fb_user_id: string | null;
    access_token: string;
    token_expires_at: string | null;
    scope: string | null;
    discovered_pages: DiscoveredPages | null;
    selected_assets: MetaSelectedAssets | null;
    created_at: string;
  };

  const rows = (data ?? []) as unknown as MetaConnectionListRow[];
  const refreshed: MetaConnectionListRow[] = await Promise.all(
    rows.map(async (row) => {
      try {
        return await refreshMetaConnectionAssetsIfEmpty(row);
      } catch {
        return row;
      }
    }),
  );
  return refreshed.map(({ access_token: _accessToken, ...safe }) => safe);
}

export async function updateMetaConnectionSelectionImpl(
  userId: string,
  id: string,
  selection: MetaSelectedAssets,
) {
  const { data: row } = await supabaseAdmin
    .from("meta_connections")
    .select("report_id")
    .eq("id", id)
    .maybeSingle();
  if (!row) throw new Error("Conexão não encontrada");
  await assertCanManageReport(userId, row.report_id);
  const { error } = await supabaseAdmin
    .from("meta_connections")
    .update({ selected_assets: selection as unknown as never })
    .eq("id", id);
  if (error) throw new Error(error.message);
  // Invalida cache do relatório para refletir a nova seleção imediatamente.
  await supabaseAdmin.from("windsor_cache").delete().eq("report_id", row.report_id);
  return { ok: true };
}



export async function deleteMetaConnectionImpl(userId: string, id: string) {
  const { data: row } = await supabaseAdmin
    .from("meta_connections")
    .select("report_id")
    .eq("id", id)
    .maybeSingle();
  if (!row) throw new Error("Conexão não encontrada");
  await assertCanManageReport(userId, row.report_id);
  const { error } = await supabaseAdmin.from("meta_connections").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await supabaseAdmin.from("windsor_cache").delete().eq("report_id", row.report_id);
  return { ok: true };
}

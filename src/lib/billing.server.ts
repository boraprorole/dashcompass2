/**
 * Financeiro & Uso da agência.
 *
 * Reúne, para o admin da agência (ou admin global), o estado da assinatura
 * vigente e as métricas de uso: empresas criadas, relatórios e contas
 * integradas por conector.
 */

type Db = Awaited<ReturnType<typeof admin>>;

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

const CONNECTION_TABLES = [
  { table: "ga_connections", label: "Google Analytics 4" },
  { table: "gsc_connections", label: "Google Search Console" },
  { table: "google_ads_connections", label: "Google Ads" },
  { table: "meta_connections", label: "Meta (Facebook/Instagram)" },
  { table: "tiktok_connections", label: "TikTok Ads" },
  { table: "linkedin_connections", label: "LinkedIn" },
  { table: "pipedrive_connections", label: "Pipedrive" },
  { table: "rdstation_connections", label: "RD Station" },
  { table: "bing_connections", label: "Bing Webmaster" },
  { table: "windsor_connections", label: "Windsor.ai" },
] as const;

type CallerScope = {
  isGlobal: boolean;
  agencyId: string | null;
  ownerId: string;
};

/** Descobre o escopo do chamador e quem é o "dono" financeiro da agência. */
async function resolveScope(db: Db, callerId: string): Promise<CallerScope> {
  const { data, error } = await db
    .from("user_roles")
    .select("role, agency_id")
    .eq("user_id", callerId);
  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const isGlobal = rows.some((r) => r.role === "admin" || r.role === "admin_global");
  const isAgencyAdmin = rows.some((r) => r.role === "admin_agencia");
  if (!isGlobal && !isAgencyAdmin) throw new Error("Forbidden: admin only");

  const agencyId = rows.find((r) => r.agency_id)?.agency_id ?? null;

  // O dono financeiro é o próprio admin de agência; se o chamador é membro,
  // buscamos o admin_agencia mais antigo da mesma agência.
  let ownerId = callerId;
  if (!isAgencyAdmin && agencyId) {
    const { data: owner } = await db
      .from("user_roles")
      .select("user_id")
      .eq("agency_id", agencyId)
      .eq("role", "admin_agencia")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (owner?.user_id) ownerId = owner.user_id;
  }

  return { isGlobal, agencyId, ownerId };
}

export async function getAgencyBillingImpl(callerId: string) {
  const db = await admin();
  const scope = await resolveScope(db, callerId);

  // --- Assinatura vigente do dono da agência ---
  const { data: sub } = await db
    .from("subscriptions")
    .select("*")
    .eq("user_id", scope.ownerId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // --- Empresas da agência ---
  let companiesQuery = db.from("companies").select("id", { count: "exact" });
  if (scope.agencyId) companiesQuery = companiesQuery.eq("agency_id", scope.agencyId);
  const { data: companyRows, count: companiesCount } = await companiesQuery;

  // --- Relatórios da agência ---
  let reportsQuery = db.from("reports").select("id");
  if (scope.agencyId) reportsQuery = reportsQuery.eq("agency_id", scope.agencyId);
  const { data: reportRows } = await reportsQuery;
  const reportIds = (reportRows ?? []).map((r) => r.id);

  // --- Contas integradas por conector ---
  const connections: Array<{ label: string; count: number }> = [];
  if (reportIds.length > 0) {
    const results = await Promise.all(
      CONNECTION_TABLES.map(async (c) => {
        const { count } = await db
          .from(c.table)
          .select("id", { count: "exact", head: true })
          .in("report_id", reportIds);
        return { label: c.label, count: count ?? 0 };
      }),
    );
    connections.push(...results);
  } else {
    connections.push(...CONNECTION_TABLES.map((c) => ({ label: c.label, count: 0 })));
  }

  // --- Usuários vinculados à agência ---
  let usersCount = 0;
  if (scope.agencyId) {
    const { count } = await db
      .from("user_roles")
      .select("user_id", { count: "exact", head: true })
      .eq("agency_id", scope.agencyId);
    usersCount = count ?? 0;
  }

  // --- Planos disponíveis para upgrade ---
  const { data: plans } = await db
    .from("pricing_settings")
    .select("key, label, description, value_brl, value_usd, features_pt, sort_order, active")
    .eq("active", true)
    .order("sort_order", { ascending: true });

  const effectiveEnd =
    sub?.subscription_ends_at ?? sub?.current_period_end ?? sub?.trial_ends_at ?? null;

  const daysLeft = effectiveEnd
    ? Math.ceil((new Date(effectiveEnd).getTime() - Date.now()) / 86_400_000)
    : null;

  return {
    isGlobal: scope.isGlobal,
    subscription: sub ?? null,
    effectiveEnd,
    daysLeft,
    hasStripeCustomer: Boolean(
      sub?.stripe_customer_id && sub.stripe_customer_id !== "manual",
    ),
    usage: {
      companies: companiesCount ?? companyRows?.length ?? 0,
      reports: reportIds.length,
      users: usersCount,
      connectionsTotal: connections.reduce((acc, c) => acc + c.count, 0),
      connections,
    },
    plans: plans ?? [],
  };
}

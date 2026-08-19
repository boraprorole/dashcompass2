import { supabaseAdmin } from "@/integrations/supabase/client.server";

type CallerContext = {
  isGlobal: boolean;
  agencyId: string | null;
};

/**
 * Resolve o contexto do chamador: se é admin global (vê tudo) ou
 * admin de agência (vê somente usuários vinculados à sua agência).
 */
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

  const agencyId = rows.find((r) => r.agency_id)?.agency_id ?? null;
  return { isGlobal, agencyId };
}

export async function listUsersImpl(callerId: string) {
  const caller = await getCallerContext(callerId);

  const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (authError) throw new Error(authError.message);

  const ids = authUsers.users.map((u) => u.id);

  const [{ data: profiles }, { data: roles }] = await Promise.all([
    supabaseAdmin.from("profiles").select("id, display_name, avatar_url, company_id").in("id", ids),
    supabaseAdmin.from("user_roles").select("user_id, role, agency_id").in("user_id", ids),
  ]);

  const allRoles = roles ?? [];

  // Admin de agência enxerga apenas usuários vinculados à própria agência.
  let visibleIds: Set<string> | null = null;
  if (!caller.isGlobal) {
    visibleIds = new Set<string>([callerId]);
    if (caller.agencyId) {
      for (const r of allRoles) {
        if (r.agency_id === caller.agencyId) visibleIds.add(r.user_id);
      }
    }
  }

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  const adminSet = new Set(allRoles.filter((r) => r.role === "admin" || r.role === "admin_global").map((r) => r.user_id));
  const agencyAdminSet = new Set(allRoles.filter((r) => r.role === "admin_agencia").map((r) => r.user_id));
  const teamSet = new Set(allRoles.filter((r) => r.role === "team").map((r) => r.user_id));
  const conexoesSet = new Set(allRoles.filter((r) => r.role === "conexoes").map((r) => r.user_id));
  const agencyMap = new Map<string, string | null>();
  for (const r of allRoles) {
    if (r.agency_id) agencyMap.set(r.user_id, r.agency_id);
  }

  return authUsers.users
    .filter((u) => (visibleIds ? visibleIds.has(u.id) : true))
    .map((u) => ({
      id: u.id,
      email: u.email ?? "",
      createdAt: u.created_at,
      displayName: profileMap.get(u.id)?.display_name ?? null,
      avatarUrl: profileMap.get(u.id)?.avatar_url ?? null,
      isAdmin: adminSet.has(u.id),
      isAgencyAdmin: agencyAdminSet.has(u.id),
      isTeam: teamSet.has(u.id),
      isConexoes: conexoesSet.has(u.id),
      companyId: profileMap.get(u.id)?.company_id ?? null,
      agencyId: agencyMap.get(u.id) ?? null,
    }))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

/**
 * Vincula (ou desvincula) um e-mail já cadastrado à agência do admin chamador,
 * com o papel escolhido: "user" (usuário) ou "team" (equipe).
 */
export async function linkUserToAgencyImpl(
  callerId: string,
  email: string,
  role: "user" | "team",
  active: boolean,
) {
  const caller = await getCallerContext(callerId);
  const agencyId = caller.agencyId;

  if (!agencyId) {
    throw new Error("Sua conta não está vinculada a nenhuma agência.");
  }

  const normalized = email.trim().toLowerCase();
  if (!normalized) throw new Error("Informe um e-mail válido.");

  // Localiza o usuário pelo e-mail (a Auth Admin API não filtra por e-mail).
  const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (authError) throw new Error(authError.message);

  const target = authUsers.users.find((u) => (u.email ?? "").toLowerCase() === normalized);
  if (!target) {
    throw new Error("Nenhum usuário cadastrado com este e-mail. Peça para ele criar a conta primeiro.");
  }

  if (!active) {
    const { error } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", target.id)
      .eq("role", role)
      .eq("agency_id", agencyId);
    if (error) throw new Error(error.message);
    return { ok: true, userId: target.id, active: false };
  }

  const { error } = await supabaseAdmin
    .from("user_roles")
    .upsert({ user_id: target.id, role, agency_id: agencyId }, { onConflict: "user_id,role" });
  if (error) throw new Error(error.message);

  return { ok: true, userId: target.id, active: true };
}


export async function setUserRoleImpl(
  callerId: string,
  targetUserId: string,
  role: "admin" | "team" | "conexoes" | "admin_agencia" | "admin_global",
  assign: boolean,
) {

  const caller = await getCallerContext(callerId);

  if (assign) {
    // Admin de agência sempre vincula o papel à própria agência.
    const payload: { user_id: string; role: typeof role; agency_id?: string } = {
      user_id: targetUserId,
      role,
    };
    if (!caller.isGlobal && caller.agencyId) payload.agency_id = caller.agencyId;

    const { error } = await supabaseAdmin
      .from("user_roles")
      .upsert(payload, { onConflict: "user_id,role" });
    if (error) throw new Error(error.message);
  } else {
    if (role === "admin" && targetUserId === callerId) {
      throw new Error("Você não pode remover seu próprio acesso de admin.");
    }
    const { error } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", targetUserId)
      .eq("role", role);
    if (error) throw new Error(error.message);
  }
  return { ok: true };
}


/**
 * Vincula um e-mail (usuário já cadastrado) a uma empresa específica.
 * Independente de vínculos anteriores: sobrescreve o company_id do perfil.
 */
export async function linkUserToCompanyByEmailImpl(
  callerId: string,
  email: string,
  companyId: string,
) {
  const caller = await getCallerContext(callerId);

  const normalized = email.trim().toLowerCase();
  if (!normalized) throw new Error("Informe um e-mail válido.");

  // Admin de agência só pode vincular a empresas da própria agência.
  if (!caller.isGlobal) {
    const { data: company, error: companyError } = await supabaseAdmin
      .from("companies")
      .select("id, agency_id")
      .eq("id", companyId)
      .maybeSingle();
    if (companyError) throw new Error(companyError.message);
    if (!company) throw new Error("Empresa não encontrada.");
    if (caller.agencyId && company.agency_id && company.agency_id !== caller.agencyId) {
      throw new Error("Esta empresa não pertence à sua agência.");
    }
  }

  const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (authError) throw new Error(authError.message);

  const target = authUsers.users.find((u) => (u.email ?? "").toLowerCase() === normalized);
  if (!target) {
    throw new Error("Nenhum usuário cadastrado com este e-mail. Peça para ele criar a conta em /cadastro-user.");
  }

  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .upsert({ id: target.id, company_id: companyId }, { onConflict: "id" });
  if (profileError) throw new Error(profileError.message);

  // Garante papel de usuário na agência do admin chamador (quando aplicável).
  if (caller.agencyId) {
    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: target.id, role: "user", agency_id: caller.agencyId }, { onConflict: "user_id,role" });
  }

  // Acesso a Conexões por padrão.
  await supabaseAdmin
    .from("user_roles")
    .upsert({ user_id: target.id, role: "conexoes" }, { onConflict: "user_id,role" });

  return { ok: true, userId: target.id, email: normalized };
}

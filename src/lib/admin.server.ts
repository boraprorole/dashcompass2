import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(callerId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", callerId)
    .in("role", ["admin", "admin_global", "admin_agencia"])
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin only");
}

export async function listUsersImpl(callerId: string) {
  await assertAdmin(callerId);

  const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (authError) throw new Error(authError.message);

  const ids = authUsers.users.map((u) => u.id);

  const [{ data: profiles }, { data: roles }] = await Promise.all([
    supabaseAdmin.from("profiles").select("id, display_name, avatar_url, company_id").in("id", ids),
    supabaseAdmin.from("user_roles").select("user_id, role").in("user_id", ids),
  ]);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  const adminSet = new Set((roles ?? []).filter((r) => r.role === "admin").map((r) => r.user_id));
  const teamSet = new Set((roles ?? []).filter((r) => r.role === "team").map((r) => r.user_id));
  const conexoesSet = new Set((roles ?? []).filter((r) => r.role === "conexoes").map((r) => r.user_id));

  return authUsers.users
    .map((u) => ({
      id: u.id,
      email: u.email ?? "",
      createdAt: u.created_at,
      displayName: profileMap.get(u.id)?.display_name ?? null,
      avatarUrl: profileMap.get(u.id)?.avatar_url ?? null,
      isAdmin: adminSet.has(u.id),
      isTeam: teamSet.has(u.id),
      isConexoes: conexoesSet.has(u.id),
      companyId: profileMap.get(u.id)?.company_id ?? null,
    }))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function setUserRoleImpl(
  callerId: string,
  targetUserId: string,
  role: "admin" | "team" | "conexoes",
  assign: boolean,
) {

  await assertAdmin(callerId);

  if (assign) {
    const { error } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: targetUserId, role }, { onConflict: "user_id,role" });
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


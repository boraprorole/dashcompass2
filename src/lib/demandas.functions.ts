import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SETTING_KEY = "demandas_enabled";

export const getDemandasEnabled = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("app_settings")
      .select("value")
      .eq("key", SETTING_KEY)
      .maybeSingle();
    return { enabled: data?.value === "true" };
  });

export const setDemandasEnabled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ enabled: z.boolean() }).parse(input))
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: role } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .in("role", ["admin", "admin_global", "admin_agencia"])
      .limit(1)
      .maybeSingle();
    if (!role) throw new Error("Forbidden: admin only");

    const { error } = await supabaseAdmin
      .from("app_settings")
      .upsert({
        key: SETTING_KEY,
        value: data.enabled ? "true" : "false",
        updated_at: new Date().toISOString(),
      });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const DEMANDA_STATUSES = [
  "pauta",
  "planejamento",
  "live",
  "redacao_conteudo",
  "criacao",
  "atendimento",
  "aprovacao_cliente",
  "publicar",
  "finalizado",
] as const;

async function assertTeamOrAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["team", "admin"]);
  if (!data || data.length === 0) throw new Error("Forbidden");
}

export const listDemandas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertTeamOrAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await (supabaseAdmin as any)
      .from("demandas")
      .select("*")
      .order("position", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { demandas: (data ?? []) as Array<{
      id: string;
      title: string;
      description: string | null;
      status: string;
      assignee_id: string | null;
      created_by: string | null;
      company_id: string | null;
      due_date: string | null;
      position: number;
      created_at: string;
      updated_at: string;
    }> };
  });

export const listTeamMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertTeamOrAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .in("role", ["team", "admin"]);
    const ids = Array.from(new Set((roles ?? []).map((r) => r.user_id)));
    if (ids.length === 0) return { members: [] };
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", ids);
    return {
      members: (profiles ?? []).map((p) => ({
        id: p.id,
        display_name: p.display_name ?? "Sem nome",
        avatar_url: p.avatar_url ?? null,
      })),
    };
  });

export const createDemanda = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      title: z.string().min(1),
      description: z.string().optional().nullable(),
      status: z.string().optional(),
      assignee_id: z.string().uuid().nullable().optional(),
      due_date: z.string().nullable().optional(),
    }).parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertTeamOrAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await (supabaseAdmin as any)
      .from("demandas")
      .insert({
        title: data.title,
        description: data.description ?? null,
        status: data.status ?? "pauta",
        assignee_id: data.assignee_id ?? null,
        due_date: data.due_date ?? null,
        created_by: context.userId,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { demanda: row };
  });

export const updateDemanda = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      id: z.string().uuid(),
      title: z.string().optional(),
      description: z.string().nullable().optional(),
      status: z.string().optional(),
      assignee_id: z.string().uuid().nullable().optional(),
      due_date: z.string().nullable().optional(),
      position: z.number().optional(),
    }).parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertTeamOrAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, ...patch } = data;
    const { error } = await (supabaseAdmin as any)
      .from("demandas")
      .update(patch)
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteDemanda = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    await assertTeamOrAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any)
      .from("demandas")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

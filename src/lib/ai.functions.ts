import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  AI_MODELS,
  AI_MODES,
  assertAdmin,
  getAiKeyStatusImpl,
  setAiKeyImpl,
  type AiProvider,
  type AiMode,
} from "./ai.server";

export const aiCatalog = { models: AI_MODELS, modes: AI_MODES };

const providerSchema = z.enum(["anthropic", "openai"]);
const modeSchema = z.enum(["general", "windsor_analyst"]);

export const listAiThreads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("ai_threads")
      .select("id, title, provider, model, mode, report_id, updated_at, created_at")
      .eq("user_id", context.userId)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createAiThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        title: z.string().max(200).optional(),
        provider: providerSchema.optional(),
        model: z.string().max(80).optional(),
        mode: modeSchema.optional(),
        reportId: z.string().uuid().nullable().optional(),
        agentId: z.string().uuid().nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Default to the flagged default agent if none provided
    let agentId = data.agentId ?? null;
    let provider = data.provider ?? "anthropic";
    let model = data.model ?? AI_MODELS[provider][0].id;
    let mode = data.mode ?? "general";
    let agentName: string | null = null;
    if (!agentId) {
      const { data: def } = await supabaseAdmin
        .from("ai_agents" as never)
        .select("id, name")
        .eq("is_default", true)
        .maybeSingle();
      if (def) {
        const d = def as { id: string; name: string };
        agentId = d.id;
        agentName = d.name;
      }
    } else {
      const { data: a } = await supabaseAdmin
        .from("ai_agents" as never)
        .select("name")
        .eq("id", agentId)
        .maybeSingle();
      agentName = (a as { name: string } | null)?.name ?? null;
    }

    const title = data.title ?? (await buildThreadTitle(supabaseAdmin, data.reportId ?? null, agentName));

    const { data: row, error } = await supabaseAdmin
      .from("ai_threads")
      .insert({
        user_id: context.userId,
        title,
        provider,
        model,
        mode,
        report_id: data.reportId ?? null,
        agent_id: agentId,
      } as never)
      .select("id")
      .single();
    if (error || !row) throw new Error(error?.message ?? "Falha ao criar thread");
    return { id: row.id };
  });

async function buildThreadTitle(
  supabaseAdmin: any,
  reportId: string | null,
  agentName: string | null,
): Promise<string> {
  let companyName: string | null = null;
  if (reportId) {
    const { data: r } = await (supabaseAdmin as any)
      .from("reports")
      .select("companies(name)")
      .eq("id", reportId)
      .maybeSingle();
    companyName = (r as { companies: { name: string } | null } | null)?.companies?.name ?? null;
  }
  if (companyName && agentName) return `${companyName} · ${agentName}`;
  if (companyName) return companyName;
  if (agentName) return agentName;
  return "Nova conversa";
}

export const updateAiThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        title: z.string().max(200).optional(),
        provider: providerSchema.optional(),
        model: z.string().max(80).optional(),
        mode: modeSchema.optional(),
        reportId: z.string().uuid().nullable().optional(),
        agentId: z.string().uuid().nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: {
      title?: string;
      provider?: string;
      model?: string;
      mode?: string;
      report_id?: string | null;
      agent_id?: string | null;
    } = {};
    if (data.title !== undefined) patch.title = data.title;
    if (data.provider !== undefined) patch.provider = data.provider;
    if (data.model !== undefined) patch.model = data.model;
    if (data.mode !== undefined) patch.mode = data.mode;
    if (data.reportId !== undefined) patch.report_id = data.reportId;
    if (data.agentId !== undefined) patch.agent_id = data.agentId;

    // Auto-regenerate title (COMPANY · AGENT) when report/agent changes and title was not explicitly set
    if (data.title === undefined && (data.reportId !== undefined || data.agentId !== undefined)) {
      const { data: current } = await supabaseAdmin
        .from("ai_threads")
        .select("report_id, agent_id")
        .eq("id", data.id)
        .eq("user_id", context.userId)
        .maybeSingle();
      const cur = current as { report_id: string | null; agent_id: string | null } | null;
      const nextReportId = data.reportId !== undefined ? data.reportId : cur?.report_id ?? null;
      const nextAgentId = data.agentId !== undefined ? data.agentId : cur?.agent_id ?? null;
      let agentName: string | null = null;
      if (nextAgentId) {
        const { data: a } = await supabaseAdmin
          .from("ai_agents" as never)
          .select("name")
          .eq("id", nextAgentId)
          .maybeSingle();
        agentName = (a as { name: string } | null)?.name ?? null;
      }
      patch.title = await buildThreadTitle(supabaseAdmin, nextReportId, agentName);
    }
    const { error } = await supabaseAdmin
      .from("ai_threads")
      .update(patch as never)
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };

  });

export const deleteAiThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("ai_threads")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getAiThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: thread, error } = await supabaseAdmin
      .from("ai_threads")
      .select("id, title, provider, model, mode, report_id, agent_id")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!thread) throw new Error("Conversa não encontrada");
    const { data: messages, error: mErr } = await supabaseAdmin
      .from("ai_messages")
      .select("id, role, parts, created_at")
      .eq("thread_id", data.id)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });
    if (mErr) throw new Error(mErr.message);
    return { thread, messages: messages ?? [] };
  });

export const getAiKeyStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => getAiKeyStatusImpl(context.userId));

export const setAiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ provider: providerSchema, value: z.string().min(8).max(512) }).parse(input),
  )
  .handler(async ({ context, data }) =>
    setAiKeyImpl(context.userId, data.provider as AiProvider, data.value),
  );

export type AiModeId = AiMode;

/* ---------- Agents ---------- */

const agentInputSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional().nullable(),
  system_prompt: z.string().min(1).max(20000),
  is_default: z.boolean().optional(),
});

export const listAiAgents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("ai_agents" as never)
      .select("id, name, description, system_prompt, is_default, updated_at")
      .order("is_default", { ascending: false })
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as Array<{
      id: string;
      name: string;
      description: string | null;
      system_prompt: string;
      is_default: boolean;
      updated_at: string;
    }>;
  });

export const upsertAiAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => agentInputSchema.parse(input))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const row = {
      name: data.name,
      description: data.description ?? null,
      system_prompt: data.system_prompt,
      is_default: data.is_default ?? false,
    };
    if (data.is_default) {
      await supabaseAdmin
        .from("ai_agents" as never)
        .update({ is_default: false } as never)
        .neq("id", data.id ?? "00000000-0000-0000-0000-000000000000");
    }
    if (data.id) {
      const { error } = await supabaseAdmin
        .from("ai_agents" as never)
        .update(row as never)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: inserted, error } = await supabaseAdmin
      .from("ai_agents" as never)
      .insert(row as never)
      .select("id")
      .single();
    if (error || !inserted) throw new Error(error?.message ?? "Falha ao salvar");
    return { id: (inserted as { id: string }).id };
  });

export const deleteAiAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("ai_agents" as never)
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });


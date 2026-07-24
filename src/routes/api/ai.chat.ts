import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from "ai";
import {
  assertAdmin,
  buildModel,
  buildWindsorTools,
  getReportName,
  systemPromptFor,
  type AiMode,
  type AiProvider,
} from "@/lib/ai.server";

type ChatBody = {
  threadId?: string;
  provider?: AiProvider;
  model?: string;
  mode?: AiMode;
  reportId?: string | null;
  messages?: UIMessage[];
};

async function authUser(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) throw new Response("Unauthorized", { status: 401 });
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) throw new Response("Unauthorized", { status: 401 });
  return data.user.id;
}

export const Route = createFileRoute("/api/ai/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let userId: string;
        try {
          userId = await authUser(request);
        } catch (r) {
          if (r instanceof Response) return r;
          return new Response("Unauthorized", { status: 401 });
        }

        try {
          await assertAdmin(userId);
        } catch {
          return new Response("Forbidden", { status: 403 });
        }

        const body = (await request.json()) as ChatBody;
        const messages = Array.isArray(body.messages) ? body.messages : [];
        if (!messages.length) return new Response("messages required", { status: 400 });
        if (!body.threadId) return new Response("threadId required", { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Ensure the thread belongs to this user (and pull current settings)
        const { data: thread } = await supabaseAdmin
          .from("ai_threads")
          .select("id, provider, model, mode, report_id, agent_id")
          .eq("id", body.threadId)
          .eq("user_id", userId)
          .maybeSingle();
        if (!thread) return new Response("Thread not found", { status: 404 });

        const provider = (body.provider ?? thread.provider) as AiProvider;
        const modelId = body.model ?? thread.model;
        const mode = (body.mode ?? thread.mode) as AiMode;
        const reportId = body.reportId ?? thread.report_id ?? null;
        const agentId = (thread as { agent_id?: string | null }).agent_id ?? null;

        // Persist settings drift on the thread
        await supabaseAdmin
          .from("ai_threads")
          .update({
            provider,
            model: modelId,
            mode,
            report_id: reportId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", body.threadId);

        let model;
        try {
          model = await buildModel(provider, modelId);
        } catch (e) {
          return Response.json({ error: (e as Error).message }, { status: 400 });
        }

        // Load agent's custom prompt if set
        let customPrompt: string | null = null;
        if (agentId) {
          const { data: agent } = await supabaseAdmin
            .from("ai_agents" as never)
            .select("system_prompt")
            .eq("id", agentId)
            .maybeSingle();
          customPrompt = (agent as { system_prompt?: string } | null)?.system_prompt ?? null;
        }

        const reportName = await getReportName(reportId);
        const baseSystem = systemPromptFor(mode, !!reportId, reportName);
        const system = customPrompt
          ? `${customPrompt}\n\n---\nContexto do sistema:\n${baseSystem}`
          : baseSystem;
        const tools = buildWindsorTools(userId, reportId);


        // Persist the last user message (best-effort)
        const lastUser = [...messages].reverse().find((m) => m.role === "user");
        if (lastUser) {
          const { data: existing } = await supabaseAdmin
            .from("ai_messages")
            .select("id")
            .eq("thread_id", body.threadId)
            .eq("id", lastUser.id)
            .maybeSingle();
          if (!existing) {
            const userMsgId =
              lastUser.id && lastUser.id.trim().length > 0
                ? lastUser.id
                : (globalThis.crypto?.randomUUID?.() ?? `user_${Date.now()}_${Math.random().toString(36).slice(2)}`);
            await supabaseAdmin.from("ai_messages").insert({
              id: userMsgId,
              thread_id: body.threadId,
              role: "user",
              parts: lastUser.parts as unknown as import("@/integrations/supabase/types").Database["public"]["Tables"]["ai_messages"]["Insert"]["parts"],
            });
          }
          // Auto-title from first user message if still default
          const { data: t } = await supabaseAdmin
            .from("ai_threads")
            .select("title")
            .eq("id", body.threadId)
            .maybeSingle();
          if (t?.title === "Nova conversa") {
            const text = (lastUser.parts as Array<{ type: string; text?: string }>)
              .filter((p) => p.type === "text")
              .map((p) => p.text ?? "")
              .join(" ")
              .slice(0, 80);
            if (text) {
              await supabaseAdmin
                .from("ai_threads")
                .update({ title: text })
                .eq("id", body.threadId);
            }
          }
        }

        try {
          const result = streamText({
            model,
            system,
            messages: await convertToModelMessages(messages),
            tools,
            stopWhen: stepCountIs(50),
          });

          return result.toUIMessageStreamResponse({
            onError: (error) => {
              console.error("[ai.chat] stream error", error);
              if (error == null) return "unknown error";
              if (typeof error === "string") return error;
              if (error instanceof Error) return error.message;
              try { return JSON.stringify(error); } catch { return "stream error"; }
            },
            originalMessages: messages,
            onFinish: async ({ messages: finalMessages }) => {
              // Persist every NEW assistant message produced in this run,
              // so multi-step tool calls / results become part of the
              // conversation history on future turns.
              const originalIds = new Set(messages.map((m) => m.id));
              const newAssistants = finalMessages.filter(
                (m) => m.role === "assistant" && !originalIds.has(m.id),
              );
              type PartsCol = import("@/integrations/supabase/types").Database["public"]["Tables"]["ai_messages"]["Insert"]["parts"];
              for (const asst of newAssistants) {
                const id =
                  asst.id && asst.id.trim().length > 0
                    ? asst.id
                    : (globalThis.crypto?.randomUUID?.() ?? `asst_${Date.now()}_${Math.random().toString(36).slice(2)}`);
                await supabaseAdmin.from("ai_messages").upsert(
                  {
                    id,
                    thread_id: body.threadId!,
                    role: "assistant",
                    parts: asst.parts as unknown as PartsCol,
                  },
                  { onConflict: "id" },
                );
              }
              await supabaseAdmin
                .from("ai_threads")
                .update({ updated_at: new Date().toISOString() })
                .eq("id", body.threadId!);
            },
          });
        } catch (e) {
          const msg = (e as Error).message ?? "Falha na chamada ao modelo";
          return Response.json({ error: msg }, { status: 500 });
        }
      },
    },
  },
});

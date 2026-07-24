import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { UIMessage } from "ai";
import {
  Loader2,
  MessageSquarePlus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { AiChatWindow, type ChatSettings } from "@/components/ai/AiChatWindow";
import {
  aiCatalog,
  createAiThread,
  deleteAiThread,
  getAiThread,
  listAiAgents,
  listAiThreads,
  updateAiThread,
} from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/ai")({
  component: AiPage,
});

type ThreadRow = {
  id: string;
  title: string;
  provider: string;
  model: string;
  mode: string;
  report_id: string | null;
  updated_at: string;
};

function AiPage() {
  const { isAdmin, loading: isAdminLoading } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const threadsQuery = useQuery({
    queryKey: ["ai-threads"],
    queryFn: async () => (await listAiThreads()) as ThreadRow[],
    enabled: !!isAdmin,
  });

  const reportsQuery = useQuery({
    queryKey: ["ai-reports"],
    enabled: !!isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("id, title, companies(name)")
        .order("title", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        title: string;
        companies: { name: string } | null;
      }>;
    },
  });

  useEffect(() => {
    if (!threadsQuery.data) return;
    if (selectedId && threadsQuery.data.find((t) => t.id === selectedId)) return;
    setSelectedId(threadsQuery.data[0]?.id ?? null);
  }, [threadsQuery.data, selectedId]);

  const newThread = async () => {
    const res = await createAiThread({ data: {} });
    await qc.invalidateQueries({ queryKey: ["ai-threads"] });
    setSelectedId(res.id);
  };

  const removeThread = async (id: string) => {
    await deleteAiThread({ data: { id } });
    await qc.invalidateQueries({ queryKey: ["ai-threads"] });
    if (selectedId === id) setSelectedId(null);
  };

  if (isAdminLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando…
      </div>
    );
  }

  if (!isAdmin) {
    // Fallback: shouldn't render because the link only shows for admins
    useEffect(() => {
      navigate({ to: "/reports" });
    }, []);
    return null;
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-3rem)] w-full max-w-7xl gap-4">
      {/* Thread list */}
      <aside className="hidden w-64 shrink-0 flex-col rounded-2xl border border-border/50 bg-card/70 p-3 md:flex">
        <div className="mb-3 flex items-center gap-2 px-1">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Compass AI</span>
        </div>
        <Button size="sm" className="mb-3 gap-2" onClick={newThread}>
          <MessageSquarePlus className="h-4 w-4" /> Nova conversa
        </Button>
        <div className="flex-1 space-y-1 overflow-y-auto pr-1">
          {threadsQuery.isLoading ? (
            <div className="p-2 text-xs text-muted-foreground">Carregando…</div>
          ) : threadsQuery.data?.length ? (
            threadsQuery.data.map((t) => (
              <div
                key={t.id}
                className={cn(
                  "group flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm hover:bg-accent",
                  selectedId === t.id && "bg-accent",
                )}
              >
                <button
                  type="button"
                  onClick={() => setSelectedId(t.id)}
                  className="flex-1 truncate text-left"
                  title={t.title}
                >
                  {t.title || "Sem título"}
                </button>
                <button
                  type="button"
                  onClick={() => removeThread(t.id)}
                  className="opacity-0 transition group-hover:opacity-100"
                  title="Excluir"
                >
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            ))
          ) : (
            <div className="p-2 text-xs text-muted-foreground">Nenhuma conversa ainda.</div>
          )}
        </div>
      </aside>

      {/* Chat panel */}
      <section className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-border/50 bg-card/60">
        {selectedId ? (
          <ChatPanel
            key={selectedId}
            threadId={selectedId}
            reports={reportsQuery.data ?? []}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            <div className="text-center">
              <Sparkles className="mx-auto mb-2 h-6 w-6 text-primary" />
              <p>Crie uma nova conversa para começar.</p>
              <Button size="sm" className="mt-3 gap-2" onClick={newThread}>
                <MessageSquarePlus className="h-4 w-4" /> Nova conversa
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function ChatPanel({
  threadId,
  reports,
}: {
  threadId: string;
  reports: Array<{ id: string; title: string; companies: { name: string } | null }>;
}) {
  const qc = useQueryClient();
  const threadQuery = useQuery({
    queryKey: ["ai-thread", threadId],
    queryFn: async () => getAiThread({ data: { id: threadId } }),
  });

  const agentsQuery = useQuery({
    queryKey: ["ai-agents"],
    queryFn: async () => listAiAgents(),
  });

  const [settings, setSettings] = useState<(ChatSettings & { agentId: string | null }) | null>(null);

  useEffect(() => {
    if (!threadQuery.data) return;
    const t = threadQuery.data.thread as typeof threadQuery.data.thread & { agent_id?: string | null };
    setSettings({
      provider: t.provider as ChatSettings["provider"],
      model: t.model,
      reportId: t.report_id,
      agentId: t.agent_id ?? null,
    });
  }, [threadQuery.data]);

  const initialMessages = useMemo<UIMessage[]>(() => {
    if (!threadQuery.data) return [];
    return threadQuery.data.messages.map((m) => ({
      id: m.id,
      role: m.role as UIMessage["role"],
      parts: (m.parts ?? []) as UIMessage["parts"],
    }));
  }, [threadQuery.data]);

  const persist = async (patch: Partial<ChatSettings & { agentId: string | null }>) => {
    if (!settings) return;
    const next = { ...settings, ...patch };
    setSettings(next);
    await updateAiThread({
      data: {
        id: threadId,
        provider: next.provider,
        model: next.model,
        reportId: next.reportId,
        agentId: next.agentId,
      },
    });
    qc.invalidateQueries({ queryKey: ["ai-threads"] });
  };

  if (threadQuery.isLoading || !settings) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando conversa…
      </div>
    );
  }

  const models = aiCatalog.models[settings.provider];
  const agents = agentsQuery.data ?? [];


  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-border/60 p-3">
        <Select
          value={settings.agentId ?? "__none"}
          onValueChange={(v) => {
            if (v === "__none") {
              persist({ agentId: null });
              return;
            }
            const a = agents.find((x) => x.id === v);
            if (!a) return;
            persist({ agentId: a.id });
          }}
        >
          <SelectTrigger className="h-8 w-[220px] text-xs">
            <SelectValue placeholder="Agente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none">Padrão (sem agente)</SelectItem>
            {agents.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}{a.is_default ? " · padrão" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>


        <Select
          value={settings.provider}
          onValueChange={(v) => {
            const provider = v as ChatSettings["provider"];
            const first = aiCatalog.models[provider][0].id;
            persist({ provider, model: first });
          }}
        >
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <SelectValue placeholder="Provedor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="anthropic">Anthropic</SelectItem>
            <SelectItem value="openai">OpenAI</SelectItem>
          </SelectContent>
        </Select>

        <Select value={settings.model} onValueChange={(v) => persist({ model: v })}>
          <SelectTrigger className="h-8 w-[200px] text-xs">
            <SelectValue placeholder="Modelo" />
          </SelectTrigger>
          <SelectContent>
            {models.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>


        <Select
          value={settings.reportId ?? "__none"}
          onValueChange={(v) => persist({ reportId: v === "__none" ? null : v })}
        >
          <SelectTrigger className="h-8 w-[240px] text-xs">
            <SelectValue placeholder="Empresa / relatório" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none">Sem relatório</SelectItem>
            {reports.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.companies?.name ? `${r.companies.name} · ${r.title}` : r.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 min-h-0">
        <AiChatWindow threadId={threadId} initialMessages={initialMessages} settings={settings} />
      </div>
    </div>
  );
}

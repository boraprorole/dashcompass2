import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  aiCatalog,
  deleteAiAgent,
  getAiKeyStatus,
  listAiAgents,
  setAiKey,
  upsertAiAgent,
} from "@/lib/ai.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, Key, Save, Sparkles, Bot, Pencil, Trash2, Plus } from "lucide-react";

type Provider = "anthropic" | "openai";

const META: Record<Provider, { label: string; hint: string }> = {
  anthropic: { label: "Anthropic (Claude)", hint: "Formato: sk-ant-…" },
  openai: { label: "OpenAI (GPT)", hint: "Formato: sk-… ou sk-proj-…" },
};

type Agent = {
  id: string;
  name: string;
  description: string | null;
  system_prompt: string;
  is_default: boolean;
  updated_at: string;
};

export function AdminAITab() {
  const statusFn = useServerFn(getAiKeyStatus);
  const saveFn = useServerFn(setAiKey);
  const qc = useQueryClient();

  const statusQ = useQuery({
    queryKey: ["ai-key-status"],
    queryFn: () => statusFn(),
  });

  return (
    <div className="space-y-6">
      <div className="glass-strong rounded-3xl p-6 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Marsala AI · Provedores</h2>
            <p className="text-xs text-muted-foreground">
              Configure as chaves usadas pelo chatbot Marsala AI. As chaves ficam
              armazenadas com segurança e substituem eventuais variáveis de ambiente.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {(Object.keys(META) as Provider[]).map((provider) => (
          <ProviderCard
            key={provider}
            provider={provider}
            status={statusQ.data?.[provider]}
            loading={statusQ.isLoading}
            onSaved={() => qc.invalidateQueries({ queryKey: ["ai-key-status"] })}
            saveFn={saveFn}
          />
        ))}
      </div>

      <AgentsSection />
    </div>
  );
}

function ProviderCard({
  provider,
  status,
  loading,
  saveFn,
  onSaved,
}: {
  provider: Provider;
  status: { hasKey: boolean; masked: string | null } | undefined;
  loading: boolean;
  saveFn: (args: { data: { provider: Provider; value: string } }) => Promise<unknown>;
  onSaved: () => void;
}) {
  const [value, setValue] = useState("");
  const mut = useMutation({
    mutationFn: () => saveFn({ data: { provider, value } }),
    onSuccess: () => {
      toast.success(`Chave ${META[provider].label} salva.`);
      setValue("");
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="glass-strong rounded-3xl p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Key className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">{META[provider].label}</h3>
          <p className="text-[11px] text-muted-foreground">{META[provider].hint}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">Status:</span>
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : status?.hasKey ? (
          <Badge variant="secondary">{status.masked}</Badge>
        ) : (
          <Badge variant="destructive">Não configurada</Badge>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${provider}-key`}>Nova chave</Label>
        <div className="flex gap-2">
          <Input
            id={`${provider}-key`}
            type="password"
            placeholder="Cole a chave da API"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <Button onClick={() => mut.mutate()} disabled={!value || mut.isPending}>
            {mut.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Salvar
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Agents ---------- */

function AgentsSection() {
  const listFn = useServerFn(listAiAgents);
  const deleteFn = useServerFn(deleteAiAgent);
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Agent | null>(null);
  const [open, setOpen] = useState(false);

  const agentsQ = useQuery({
    queryKey: ["ai-agents"],
    queryFn: async () => (await listFn()) as Agent[],
  });

  const delMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Agente removido");
      qc.invalidateQueries({ queryKey: ["ai-agents"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openNew = () => {
    setEditing(null);
    setOpen(true);
  };
  const openEdit = (a: Agent) => {
    setEditing(a);
    setOpen(true);
  };

  return (
    <div className="glass-strong rounded-3xl p-6 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Agentes</h2>
            <p className="text-xs text-muted-foreground">
              Configure agentes reutilizáveis com prompt, provedor e modelo. O agente marcado como
              padrão é usado em novas conversas.
            </p>
          </div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2" onClick={openNew}>
              <Plus className="h-4 w-4" /> Novo agente
            </Button>
          </DialogTrigger>
          <AgentDialog
            key={editing?.id ?? "new"}
            agent={editing}
            onClose={() => setOpen(false)}
            onSaved={() => {
              setOpen(false);
              qc.invalidateQueries({ queryKey: ["ai-agents"] });
            }}
          />
        </Dialog>
      </div>

      {agentsQ.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
        </div>
      ) : !agentsQ.data?.length ? (
        <div className="rounded-xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
          Nenhum agente configurado. Crie o primeiro para padronizar o comportamento do Compass AI.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {agentsQ.data.map((a) => (
            <div key={a.id} className="rounded-2xl border border-border/50 bg-card/60 p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold">{a.name}</h4>
                    {a.is_default && <Badge variant="secondary">Padrão</Badge>}
                  </div>
                  {a.description && (
                    <p className="text-xs text-muted-foreground">{a.description}</p>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(a)} title="Editar">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      if (confirm(`Excluir agente "${a.name}"?`)) delMut.mutate(a.id);
                    }}
                    title="Excluir"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              {a.is_default && (
                <div className="text-[10px] text-muted-foreground">Este agente é usado por padrão em novas conversas.</div>
              )}
              <p className="line-clamp-3 text-xs text-muted-foreground whitespace-pre-wrap">
                {a.system_prompt}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AgentDialog({
  agent,
  onSaved,
  onClose,
}: {
  agent: Agent | null;
  onSaved: () => void;
  onClose: () => void;
}) {
  const upsertFn = useServerFn(upsertAiAgent);
  const [name, setName] = useState(agent?.name ?? "");
  const [description, setDescription] = useState(agent?.description ?? "");
  const [systemPrompt, setSystemPrompt] = useState(agent?.system_prompt ?? "");
  const [isDefault, setIsDefault] = useState(!!agent?.is_default);

  const mut = useMutation({
    mutationFn: () =>
      upsertFn({
        data: {
          id: agent?.id,
          name: name.trim(),
          description: description.trim() || null,
          system_prompt: systemPrompt.trim(),
          is_default: isDefault,
        },
      }),
    onSuccess: () => {
      toast.success("Agente salvo");
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>{agent ? "Editar agente" : "Novo agente"}</DialogTitle>
      </DialogHeader>

      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="a-name">Nome</Label>
          <Input
            id="a-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Analista Windsor Sênior"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="a-desc">Descrição (opcional)</Label>
          <Input
            id="a-desc"
            value={description ?? ""}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="O que este agente faz de melhor"
          />
        </div>


        <div className="grid gap-2">
          <Label htmlFor="a-prompt">System prompt</Label>
          <Textarea
            id="a-prompt"
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="Você é um analista sênior... instruções, tom, formato de resposta..."
            className="min-h-[220px] font-mono text-xs"
          />
          <p className="text-[11px] text-muted-foreground">
            Este texto é enviado como <code>system</code> em toda mensagem do agente. Inclua tom,
            formato, regras e restrições.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Switch checked={isDefault} onCheckedChange={setIsDefault} id="a-default" />
          <Label htmlFor="a-default" className="text-sm">
            Definir como agente padrão para novas conversas
          </Label>
        </div>
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button
          onClick={() => mut.mutate()}
          disabled={mut.isPending || !name.trim() || !systemPrompt.trim()}
        >
          {mut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Salvar
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

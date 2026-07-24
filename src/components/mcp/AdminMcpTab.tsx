import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Radio,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  BookOpen,
  Terminal,
  Sparkles,
} from "lucide-react";

const MCP_URL = "https://dashboard.marsala.ag/mcp";

const TOOLS = [
  {
    name: "list_my_reports",
    desc: "Lista os relatórios aos quais você tem acesso (id, título, empresa).",
  },
  {
    name: "get_report",
    desc: "Retorna um relatório completo com suas seções pelo id.",
  },
  {
    name: "get_report_metrics",
    desc: "KPIs agregados de todos os conectores Windsor vinculados ao relatório (Instagram, Meta Ads, GA4, GSC, TikTok, LinkedIn, Google Ads, Facebook).",
  },
  {
    name: "get_instagram_top_posts",
    desc: "Top posts do Instagram do relatório em um período (legenda, permalink, likes, comentários, alcance, engajamento).",
  },
];

const CLIENTS = [
  {
    name: "ChatGPT (Deep Research / Custom Connectors)",
    steps: [
      "Abra ChatGPT → Settings → Connectors → Create.",
      "Escolha MCP e cole a URL abaixo.",
      "Autentique com sua conta do dashboard quando abrir o consent.",
    ],
  },
  {
    name: "Claude Desktop / claude.ai",
    steps: [
      "Em claude.ai → Settings → Connectors → Add custom connector.",
      "Cole a URL, tipo: Remote (HTTP).",
      "Faça login com sua conta quando pedir autorização.",
    ],
  },
  {
    name: "Cursor / Codex / outros clientes MCP",
    steps: [
      "Adicione um servidor MCP remoto (Streamable HTTP).",
      "Use a URL abaixo; o cliente vai iniciar o OAuth automaticamente.",
    ],
  },
];

function Copyable({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success("Copiado.");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Não consegui copiar.");
    }
  };
  return (
    <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-background/60 px-3 py-2">
      <code className="min-w-0 flex-1 truncate font-mono text-sm">{value}</code>
      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={copy}>
        {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );
}

export function AdminMcpTab() {
  return (
    <div className="space-y-6">
      {/* Header / URL */}
      <div className="glass-strong space-y-5 rounded-3xl p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Radio className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold">Servidor MCP</h2>
              <Badge variant="secondary" className="gap-1">
                <ShieldCheck className="h-3 w-3" /> OAuth protegido
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Conecte assistentes de IA (ChatGPT, Claude, Cursor, Codex) ao dashboard.
              Os dados retornados respeitam a mesma permissão da sua conta.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            URL do servidor
          </label>
          <Copyable value={MCP_URL} />
          <p className="text-[11px] text-muted-foreground">
            Ao adicionar essa URL em um cliente MCP, você será redirecionado para
            fazer login com sua conta Marsala. A autorização é feita via OAuth 2.1
            (Supabase) — o cliente nunca recebe sua senha.
          </p>
        </div>
      </div>

      {/* Como conectar */}
      <div className="glass-strong space-y-4 rounded-3xl p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Terminal className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Como conectar</h2>
            <p className="text-xs text-muted-foreground">
              Passo a passo para os principais clientes MCP.
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {CLIENTS.map((c) => (
            <div
              key={c.name}
              className="rounded-2xl border border-border/40 bg-background/40 p-4"
            >
              <p className="text-sm font-medium">{c.name}</p>
              <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs text-muted-foreground">
                {c.steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </div>

      {/* Ferramentas disponíveis */}
      <div className="glass-strong space-y-4 rounded-3xl p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Ferramentas expostas</h2>
            <p className="text-xs text-muted-foreground">
              O assistente conectado poderá chamar estas ferramentas.
            </p>
          </div>
        </div>

        <ul className="space-y-2">
          {TOOLS.map((t) => (
            <li
              key={t.name}
              className="flex flex-col gap-1 rounded-xl border border-border/40 bg-background/40 p-3"
            >
              <code className="font-mono text-xs text-primary">{t.name}</code>
              <p className="text-xs text-muted-foreground">{t.desc}</p>
            </li>
          ))}
        </ul>
      </div>

      {/* Segurança + docs */}
      <div className="glass-strong space-y-4 rounded-3xl p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Segurança e escopo</h2>
          </div>
        </div>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Cada chamada é autenticada como o usuário logado — RLS do banco é respeitada.</li>
          <li>Admins veem todos os relatórios; usuários da equipe só veem os relatórios atribuídos a eles.</li>
          <li>Você pode revogar o acesso de um cliente a qualquer momento pelas configurações do próprio cliente.</li>
        </ul>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button asChild variant="secondary" size="sm">
            <a
              href="https://modelcontextprotocol.io/"
              target="_blank"
              rel="noreferrer noopener"
            >
              Documentação MCP <ExternalLink className="ml-1 h-3.5 w-3.5" />
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}

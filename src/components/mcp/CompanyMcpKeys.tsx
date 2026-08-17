import { useState } from "react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listMcpKeys, createMcpKey, revokeMcpKey } from "@/lib/mcp-keys.functions";
import { KeyRound, Copy, Check, Trash2, Loader2, Radio } from "lucide-react";

const KEYED_BASE = "https://www.dashcompass.com/api/public/mcp/";

interface CompanyMcpKeysProps {
  companyId: string;
  companyName: string;
}

/**
 * Chaves MCP com escopo de empresa: o link gerado só enxerga os relatórios
 * daquela empresa, mesmo que o dono da chave tenha acesso a mais coisas.
 */
export function CompanyMcpKeys({ companyId, companyName }: CompanyMcpKeysProps) {
  const qc = useQueryClient();
  const [label, setLabel] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: keys = [], isLoading } = useQuery({
    queryKey: ["mcp-keys"],
    queryFn: () => listMcpKeys(),
  });

  const companyKeys = keys.filter((k) => !k.revoked_at && k.company_id === companyId);

  const createMut = useMutation({
    mutationFn: (value: string) => createMcpKey({ data: { label: value, companyId } }),
    onSuccess: (res) => {
      setNewKey(res.key);
      setLabel("");
      void qc.invalidateQueries({ queryKey: ["mcp-keys"] });
      toast.success("Chave criada. Copie agora — ela não será exibida novamente.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revokeMut = useMutation({
    mutationFn: (id: string) => revokeMcpKey({ data: { id } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["mcp-keys"] });
      toast.success("Chave revogada.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const copy = async (value: string) => {
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
    <div className="rounded-xl border border-border/40 bg-background/40 p-3 space-y-3">
      <h4 className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
        <Radio className="mr-1 inline h-3 w-3" /> Link MCP da empresa ({companyKeys.length})
      </h4>
      <p className="text-[11px] text-muted-foreground">
        Gera uma URL MCP já autenticada, restrita apenas aos relatórios de {companyName}. A
        URL é a credencial — quem tiver o link acessa esses dados até você revogar.
      </p>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={`Nome da chave (ex.: Claude · ${companyName})`}
          className="h-8 flex-1 text-xs"
        />
        <Button
          size="sm"
          className="h-8 text-xs"
          onClick={() => createMut.mutate(label)}
          disabled={!label.trim() || createMut.isPending}
        >
          {createMut.isPending ? (
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          ) : (
            <KeyRound className="mr-1 h-3 w-3" />
          )}
          Gerar link
        </Button>
      </div>

      {newKey && (
        <div className="space-y-2 rounded-xl border border-primary/40 bg-primary/5 p-3">
          <p className="text-[11px] font-medium text-primary">
            Copie agora — esta é a única vez que a URL completa aparece.
          </p>
          <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-background/60 px-2 py-1">
            <code className="min-w-0 flex-1 truncate font-mono text-[11px]">
              {KEYED_BASE}
              {newKey}
            </code>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => copy(`${KEYED_BASE}${newKey}`)}
            >
              {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
            </Button>
          </div>
          <Button size="sm" variant="ghost" className="h-6 text-[11px]" onClick={() => setNewKey(null)}>
            Já copiei, ocultar
          </Button>
        </div>
      )}

      {isLoading ? (
        <p className="text-[11px] text-muted-foreground">Carregando chaves…</p>
      ) : companyKeys.length === 0 ? (
        <p className="text-[11px] italic text-muted-foreground">
          Nenhum link MCP ativo para esta empresa.
        </p>
      ) : (
        <ul className="space-y-2">
          {companyKeys.map((k) => (
            <li
              key={k.id}
              className="flex items-center gap-2 rounded-lg border border-border/40 bg-background/40 p-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">{k.label}</p>
                <p className="font-mono text-[10px] text-muted-foreground">
                  {k.token_prefix}••••••••••
                  {k.last_used_at
                    ? ` · último uso ${new Date(k.last_used_at).toLocaleString("pt-BR")}`
                    : " · nunca usada"}
                </p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-destructive"
                disabled={revokeMut.isPending}
                onClick={() => {
                  if (confirm(`Revogar a chave "${k.label}"? O link deixa de funcionar.`)) {
                    revokeMut.mutate(k.id);
                  }
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

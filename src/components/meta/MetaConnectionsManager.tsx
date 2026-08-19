import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  startMetaOAuth,
  listMetaConnections,
  deleteMetaConnection,
  updateMetaConnectionSelection,
} from "@/lib/meta.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Plus, Trash2, Facebook, Instagram, Megaphone, Save } from "lucide-react";

type DiscoveredPages = {
  pages?: Array<{
    id: string;
    name: string;
    instagram: { id: string; username?: string; name?: string } | null;
  }>;
  ad_accounts?: Array<{ id: string; account_id: string; name?: string; currency?: string }>;
};

type Selection = { pages: string[]; instagrams: string[]; ad_accounts: string[] };

function SelectionEditor({
  connectionId,
  discovered,
  initial,
}: {
  connectionId: string;
  discovered: DiscoveredPages;
  initial: Selection | null;
}) {
  const updateSel = useServerFn(updateMetaConnectionSelection);
  const qc = useQueryClient();

  // legacy (null) => treat all as selected so user can trim; new => empty by default
  const defaultSel = useMemo<Selection>(() => {
    if (initial) return initial;
    return {
      pages: (discovered.pages ?? []).map((p) => p.id),
      instagrams: (discovered.pages ?? [])
        .map((p) => p.instagram?.id)
        .filter((x): x is string => !!x),
      ad_accounts: (discovered.ad_accounts ?? []).map((a) => a.account_id),
    };
  }, [initial, discovered]);

  const [sel, setSel] = useState<Selection>(defaultSel);
  useEffect(() => setSel(defaultSel), [defaultSel]);

  const toggle = (kind: keyof Selection, id: string) => {
    setSel((s) => {
      const has = s[kind].includes(id);
      return { ...s, [kind]: has ? s[kind].filter((x) => x !== id) : [...s[kind], id] };
    });
  };

  const saveMut = useMutation({
    mutationFn: () => updateSel({ data: { id: connectionId, selection: sel } }),
    onSuccess: () => {
      toast.success("Seleção salva.");
      qc.invalidateQueries({ queryKey: ["meta-conns"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pages = discovered.pages ?? [];
  const ads = discovered.ad_accounts ?? [];

  if (pages.length === 0 && ads.length === 0) {
    return (
      <p className="mt-2 text-[11px] text-muted-foreground">
        Nenhuma Página, Instagram ou conta de anúncios foi liberada nesta autorização. Refaça a
        conexão marcando todos os ativos no diálogo do Facebook.
      </p>
    );
  }

  return (
    <div className="mt-2 space-y-2">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        Selecione o que vai aparecer neste relatório
      </p>
      <div className="space-y-1.5 rounded-md border border-border/30 bg-background/40 p-2">
        {pages.map((p) => (
          <div key={p.id} className="space-y-1">
            <label className="flex items-center gap-2 text-[11px]">
              <Checkbox
                checked={sel.pages.includes(p.id)}
                onCheckedChange={() => toggle("pages", p.id)}
              />
              <Facebook className="h-3 w-3 text-primary/70" />
              <span>{p.name}</span>
            </label>
            {p.instagram && (
              <label className="ml-5 flex items-center gap-2 text-[11px]">
                <Checkbox
                  checked={sel.instagrams.includes(p.instagram.id)}
                  onCheckedChange={() => toggle("instagrams", p.instagram!.id)}
                />
                <Instagram className="h-3 w-3 text-primary/70" />
                <span>@{p.instagram.username ?? p.instagram.id}</span>
              </label>
            )}
          </div>
        ))}
        {ads.map((a) => (
          <label key={a.account_id} className="flex items-center gap-2 text-[11px]">
            <Checkbox
              checked={sel.ad_accounts.includes(a.account_id)}
              onCheckedChange={() => toggle("ad_accounts", a.account_id)}
            />
            <Megaphone className="h-3 w-3 text-primary/70" />
            <span>{a.name ?? a.account_id}</span>
            <span className="text-[10px] text-muted-foreground">
              ({a.account_id}{a.currency ? ` · ${a.currency}` : ""})
            </span>
          </label>
        ))}
      </div>
      <div className="flex justify-end">
        <Button size="sm" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
          {saveMut.isPending ? (
            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="mr-1 h-3.5 w-3.5" />
          )}
          Salvar seleção
        </Button>
      </div>
    </div>
  );
}

export function MetaConnectionsManager({ reportId }: { reportId: string }) {
  const startOAuth = useServerFn(startMetaOAuth);
  const listConns = useServerFn(listMetaConnections);
  const deleteConn = useServerFn(deleteMetaConnection);
  const qc = useQueryClient();

  const connsQ = useQuery({
    queryKey: ["meta-conns", reportId],
    queryFn: () => listConns({ data: { reportId } }),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["meta-conns", reportId] });

  const connectMut = useMutation({
    mutationFn: () => startOAuth({ data: { reportId } }),
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const connectIgMut = useMutation({
    mutationFn: () => startIgOAuth({ data: { reportId } }),
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
    onError: (e: Error) => toast.error(e.message),
  });


  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteConn({ data: { id } }),
    onSuccess: () => {
      toast.success("Conexão removida.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const hasConn = (connsQ.data?.length ?? 0) > 0;

  return (
    <div className="space-y-3 rounded-xl border border-border/40 bg-background/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-medium text-foreground">
          <Facebook className="h-3.5 w-3.5 text-primary" /> Facebook / Instagram / Ads
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => connectMut.mutate()}
            disabled={connectMut.isPending}
          >
            {connectMut.isPending ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="mr-1 h-3.5 w-3.5" />
            )}
            {hasConn ? "Conectar outra conta" : "Conectar Meta"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => connectIgMut.mutate()}
            disabled={connectIgMut.isPending}
            title="Login direto com Instagram (API com login empresarial)"
          >
            {connectIgMut.isPending ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Instagram className="mr-1 h-3.5 w-3.5" />
            )}
            Conectar Instagram
          </Button>
        </div>

      </div>

      {connsQ.isLoading ? (
        <div className="flex items-center text-xs text-muted-foreground">
          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Carregando...
        </div>
      ) : hasConn ? (
        <ul className="space-y-2">
          {connsQ.data!.map((c) => {
            const exp = c.token_expires_at ? new Date(c.token_expires_at) : null;
            const expired = exp ? exp.getTime() < Date.now() : false;
            const disc = (c.discovered_pages ?? {}) as DiscoveredPages;
            const sel = (c as { selected_assets?: Selection | null }).selected_assets ?? null;
            return (
              <li
                key={c.id}
                className="rounded-lg border border-border/30 bg-background/50 p-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">
                        {c.fb_user_name ?? "Usuário Facebook"}
                      </span>
                      <Badge
                        variant={expired ? "destructive" : "secondary"}
                        className="text-[10px]"
                      >
                        {expired ? "expirado" : "conectado"}
                      </Badge>
                    </div>
                    {exp && (
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        Expira em: {exp.toLocaleDateString("pt-BR")}
                      </p>
                    )}
                    <SelectionEditor
                      connectionId={c.id}
                      discovered={disc}
                      initial={sel}
                    />
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => deleteMut.mutate(c.id)}
                    disabled={deleteMut.isPending}
                    title="Remover conexão"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">
          Nenhuma conta Meta vinculada. Clique em "Conectar Meta" e faça login com uma conta que
          seja administradora da Página do Facebook / Instagram Business / Business Manager do
          cliente.
        </p>
      )}
    </div>
  );
}

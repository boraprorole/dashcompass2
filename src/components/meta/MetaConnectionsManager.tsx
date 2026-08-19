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
import { startInstagramLoginOAuth } from "@/lib/instagram_login.functions";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

  const igList = pages
    .filter((p) => p.instagram)
    .map((p) => p.instagram!) as Array<{ id: string; username?: string; name?: string }>;

  const summary = (count: number, total: number, empty: string) =>
    count === 0 ? empty : count === total ? `Todos (${total})` : `${count} de ${total}`;

  return (
    <div className="mt-2 space-y-2">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        Selecione o que vai aparecer neste relatório
      </p>
      <div className="grid gap-2 sm:grid-cols-3">
        {pages.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="w-full justify-between text-[11px]">
                <span className="flex items-center gap-1.5 truncate">
                  <Facebook className="h-3 w-3 text-primary/70" />
                  Selecionar Facebook
                </span>
                <span className="ml-2 shrink-0 text-[10px] text-muted-foreground">
                  {summary(sel.pages.length, pages.length, "Nenhum")}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-64 w-64 overflow-y-auto">
              <DropdownMenuLabel className="text-[10px]">Páginas do Facebook</DropdownMenuLabel>
              {pages.map((p) => (
                <DropdownMenuCheckboxItem
                  key={p.id}
                  checked={sel.pages.includes(p.id)}
                  onCheckedChange={() => toggle("pages", p.id)}
                  onSelect={(e: Event) => e.preventDefault()}
                  className="text-[11px]"
                >
                  {p.name}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {igList.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="w-full justify-between text-[11px]">
                <span className="flex items-center gap-1.5 truncate">
                  <Instagram className="h-3 w-3 text-primary/70" />
                  Selecionar Instagram
                </span>
                <span className="ml-2 shrink-0 text-[10px] text-muted-foreground">
                  {summary(sel.instagrams.length, igList.length, "Nenhum")}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-64 w-64 overflow-y-auto">
              <DropdownMenuLabel className="text-[10px]">Contas do Instagram</DropdownMenuLabel>
              {igList.map((ig) => (
                <DropdownMenuCheckboxItem
                  key={ig.id}
                  checked={sel.instagrams.includes(ig.id)}
                  onCheckedChange={() => toggle("instagrams", ig.id)}
                  onSelect={(e: Event) => e.preventDefault()}
                  className="text-[11px]"
                >
                  @{ig.username ?? ig.id}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {ads.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="w-full justify-between text-[11px]">
                <span className="flex items-center gap-1.5 truncate">
                  <Megaphone className="h-3 w-3 text-primary/70" />
                  Selecionar Meta Ads
                </span>
                <span className="ml-2 shrink-0 text-[10px] text-muted-foreground">
                  {summary(sel.ad_accounts.length, ads.length, "Nenhum")}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-64 w-72 overflow-y-auto">
              <DropdownMenuLabel className="text-[10px]">Contas de anúncios</DropdownMenuLabel>
              {ads.map((a) => (
                <DropdownMenuCheckboxItem
                  key={a.account_id}
                  checked={sel.ad_accounts.includes(a.account_id)}
                  onCheckedChange={() => toggle("ad_accounts", a.account_id)}
                  onSelect={(e: Event) => e.preventDefault()}
                  className="text-[11px]"
                >
                  {a.name ?? a.account_id}
                  <span className="ml-1 text-[10px] text-muted-foreground">
                    ({a.account_id}{a.currency ? ` · ${a.currency}` : ""})
                  </span>
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
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
  const startIgOAuth = useServerFn(startInstagramLoginOAuth);

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
            Conectar via Facebook
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
            Conectar via Instagram
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

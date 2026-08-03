import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { 
  startMetaOAuth, 
  listMetaConnections, 
  deleteMetaConnection, 
  updateMetaConnectionSelection 
} from "@/lib/meta.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Loader2,
  Plus,
  Facebook,
  Instagram,
  BarChart3,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useState } from "react";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";

export function MetaManager({ reportId }: { reportId: string }) {
  const startOAuth = useServerFn(startMetaOAuth);
  const deleteConn = useServerFn(deleteMetaConnection);
  const qc = useQueryClient();

  const { data: connections, isLoading } = useQuery({
    queryKey: ["meta-connections", reportId],
    queryFn: () => listMetaConnections({ data: { reportId } }),
  });

  const connectMut = useMutation({
    mutationFn: () => startOAuth({ data: { reportId } }),
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteConn({ data: { id } }),
    onSuccess: () => {
      toast.success("Conexão Meta removida");
      qc.invalidateQueries({ queryKey: ["meta-connections", reportId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const hasConnections = connections && connections.length > 0;

  return (
    <div className="space-y-4 rounded-xl border border-border/40 bg-background/40 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Facebook className="h-4 w-4 text-[#1877F2]" /> Meta Ecosystem
          </h3>
          <p className="text-[11px] text-muted-foreground">
            Facebook Ads, Instagram e Facebook Pages em uma única conexão via OAuth.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => connectMut.mutate()}
          disabled={connectMut.isPending}
          className="bg-[#1877F2] hover:bg-[#1877F2]/90 text-white"
        >
          {connectMut.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-2 h-4 w-4" />
          )}
          {hasConnections ? "Adicionar Conta Meta" : "Conectar Meta"}
        </Button>
      </div>

      <div className="space-y-3">
        {connections?.map((conn) => (
          <ConnectionCard 
            key={conn.id} 
            conn={conn} 
            onDelete={() => deleteMut.mutate(conn.id)} 
            isDeleting={deleteMut.isPending}
          />
        ))}
        {isLoading && <p className="text-[10px] text-muted-foreground">Carregando conexões…</p>}
        {!isLoading && !hasConnections && (
          <p className="text-[10px] text-muted-foreground italic">Nenhuma conta Meta conectada.</p>
        )}
      </div>
    </div>
  );
}

function ConnectionCard({ conn, onDelete, isDeleting }: { conn: any; onDelete: () => void; isDeleting: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const updateSelection = useServerFn(updateMetaConnectionSelection);
  const qc = useQueryClient();

  const selectionMut = useMutation({
    mutationFn: (selection: any) => updateSelection({ data: { id: conn.id, selection } }),
    onSuccess: () => {
      toast.success("Seleção de ativos atualizada");
      qc.invalidateQueries({ queryKey: ["meta-connections", conn.report_id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const currentSelection = conn.selected_assets || { pages: [], instagrams: [], ad_accounts: [] };
  const disc = conn.discovered_pages || { pages: [], ad_accounts: [] };

  const toggleAsset = (type: 'pages' | 'instagrams' | 'ad_accounts', id: string) => {
    const next = { ...currentSelection };
    if (next[type].includes(id)) {
      next[type] = next[type].filter((i: string) => i !== id);
    } else {
      next[type] = [...next[type], id];
    }
    selectionMut.mutate(next);
  };

  const selectedCount = currentSelection.pages.length + currentSelection.instagrams.length + currentSelection.ad_accounts.length;

  return (
    <div className="rounded-lg border border-border/30 bg-background/20 p-3 overflow-hidden">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-xs">
          {conn.fb_user_name?.[0] || 'M'}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium truncate">{conn.fb_user_name || "Meta User"}</p>
          <p className="text-[9px] text-muted-foreground flex gap-2">
            <span className="flex items-center gap-0.5"><Facebook className="h-2 w-2" /> {disc.pages?.length || 0}</span>
            <span className="flex items-center gap-0.5"><BarChart3 className="h-2 w-2" /> {disc.ad_accounts?.length || 0}</span>
          </p>
        </div>
        
        <Badge variant="outline" className="text-[9px] h-4 gap-1">
          {selectedCount} ativos
        </Badge>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => {
              if (confirm("Remover esta conexão Meta?")) onDelete();
            }}
            disabled={isDeleting}
          >
            {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
          </Button>
        </div>
      </div>

      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleContent className="pt-3 space-y-4 border-t border-border/20 mt-3">
          {/* Ad Accounts Dropdown */}
          <div className="space-y-2">
            <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <BarChart3 className="h-2.5 w-2.5" /> Ad Accounts
            </Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="w-full justify-between text-xs h-8 bg-white/5 border-white/10">
                  {currentSelection.ad_accounts.length > 0 
                    ? `${currentSelection.ad_accounts.length} selecionado(s)` 
                    : "Selecionar contas de anúncio"}
                  <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[300px]" align="start">
                <DropdownMenuLabel className="text-[10px]">Contas de Anúncio</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {disc.ad_accounts?.length > 0 ? (
                  disc.ad_accounts.map((ad: any) => (
                    <DropdownMenuCheckboxItem
                      key={ad.account_id}
                      checked={currentSelection.ad_accounts.includes(ad.account_id)}
                      onCheckedChange={() => toggleAsset('ad_accounts', ad.account_id)}
                      className="text-xs"
                    >
                      <div className="flex flex-col">
                        <span>{ad.name || ad.account_id}</span>
                        <span className="text-[9px] text-muted-foreground">{ad.currency}</span>
                      </div>
                    </DropdownMenuCheckboxItem>
                  ))
                ) : (
                  <div className="p-2 text-[10px] text-muted-foreground italic">Nenhuma conta encontrada</div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Facebook Pages Dropdown */}
          <div className="space-y-2">
            <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Facebook className="h-2.5 w-2.5" /> Facebook Pages
            </Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="w-full justify-between text-xs h-8 bg-white/5 border-white/10">
                  {currentSelection.pages.length > 0 
                    ? `${currentSelection.pages.length} selecionada(s)` 
                    : "Selecionar páginas"}
                  <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[300px]" align="start">
                <DropdownMenuLabel className="text-[10px]">Páginas do Facebook</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {disc.pages?.length > 0 ? (
                  disc.pages.map((page: any) => (
                    <DropdownMenuCheckboxItem
                      key={page.id}
                      checked={currentSelection.pages.includes(page.id)}
                      onCheckedChange={() => toggleAsset('pages', page.id)}
                      className="text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <Facebook className="h-3 w-3 text-[#1877F2]" />
                        <span>{page.name}</span>
                      </div>
                    </DropdownMenuCheckboxItem>
                  ))
                ) : (
                  <div className="p-2 text-[10px] text-muted-foreground italic">Nenhuma página encontrada</div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Instagram Profiles Dropdown */}
          <div className="space-y-2">
            <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Instagram className="h-2.5 w-2.5" /> Instagram Profiles
            </Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="w-full justify-between text-xs h-8 bg-white/5 border-white/10">
                  {currentSelection.instagrams.length > 0 
                    ? `${currentSelection.instagrams.length} selecionado(s)` 
                    : "Selecionar perfis"}
                  <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[300px]" align="start">
                <DropdownMenuLabel className="text-[10px]">Perfis do Instagram</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {disc.pages?.filter((p: any) => p.instagram)?.length > 0 ? (
                  disc.pages.filter((p: any) => p.instagram).map((page: any) => (
                    <DropdownMenuCheckboxItem
                      key={page.instagram.id}
                      checked={currentSelection.instagrams.includes(page.instagram.id)}
                      onCheckedChange={() => toggleAsset('instagrams', page.instagram.id)}
                      className="text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <Instagram className="h-3 w-3 text-[#E4405F]" />
                        <span>@{page.instagram.username || page.instagram.id}</span>
                        <span className="text-[9px] text-muted-foreground italic ml-auto">via {page.name}</span>
                      </div>
                    </DropdownMenuCheckboxItem>
                  ))
                ) : (
                  <div className="p-2 text-[10px] text-muted-foreground italic">Nenhum perfil Instagram Business encontrado</div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

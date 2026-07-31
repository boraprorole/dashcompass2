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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

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
          {/* Ad Accounts */}
          {disc.ad_accounts?.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold flex items-center gap-1 uppercase tracking-wider text-muted-foreground">
                <BarChart3 className="h-2.5 w-2.5" /> Ad Accounts
              </p>
              <div className="grid grid-cols-1 gap-1.5 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                {disc.ad_accounts.map((ad: any) => (
                  <div key={ad.account_id} className="flex items-center gap-2">
                    <Checkbox 
                      id={`ad-${ad.account_id}`} 
                      checked={currentSelection.ad_accounts.includes(ad.account_id)}
                      onCheckedChange={() => toggleAsset('ad_accounts', ad.account_id)}
                      disabled={selectionMut.isPending}
                    />
                    <label htmlFor={`ad-${ad.account_id}`} className="text-[11px] truncate cursor-pointer leading-none">
                      {ad.name || ad.account_id} <span className="text-[9px] text-muted-foreground">({ad.currency})</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Facebook Pages & Instagrams */}
          {disc.pages?.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold flex items-center gap-1 uppercase tracking-wider text-muted-foreground">
                <Facebook className="h-2.5 w-2.5" /> Pages & Instagram
              </p>
              <div className="grid grid-cols-1 gap-2.5 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                {disc.pages.map((page: any) => (
                  <div key={page.id} className="space-y-1.5 p-2 rounded bg-white/5 border border-white/5">
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        id={`page-${page.id}`} 
                        checked={currentSelection.pages.includes(page.id)}
                        onCheckedChange={() => toggleAsset('pages', page.id)}
                        disabled={selectionMut.isPending}
                      />
                      <label htmlFor={`page-${page.id}`} className="text-[11px] font-medium truncate cursor-pointer flex items-center gap-1">
                        <Facebook className="h-2.5 w-2.5 text-[#1877F2]" /> {page.name}
                      </label>
                    </div>
                    {page.instagram && (
                      <div className="flex items-center gap-2 ml-5 border-l border-white/10 pl-2">
                        <Checkbox 
                          id={`ig-${page.instagram.id}`} 
                          checked={currentSelection.instagrams.includes(page.instagram.id)}
                          onCheckedChange={() => toggleAsset('instagrams', page.instagram.id)}
                          disabled={selectionMut.isPending}
                        />
                        <label htmlFor={`ig-${page.instagram.id}`} className="text-[10px] truncate cursor-pointer flex items-center gap-1 text-muted-foreground">
                          <Instagram className="h-2.5 w-2.5 text-[#E4405F]" /> @{page.instagram.username || page.instagram.id}
                        </label>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

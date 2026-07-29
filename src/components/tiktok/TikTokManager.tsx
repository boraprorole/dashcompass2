import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { startTiktokOAuth } from "@/lib/tiktok.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Music2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function TikTokManager({ reportId }: { reportId: string }) {
  const startOAuth = useServerFn(startTiktokOAuth);
  const qc = useQueryClient();

  const { data: conn, isLoading } = useQuery({
    queryKey: ["tiktok-conn", reportId],
    queryFn: async () => {
      const { data } = await supabase
        .from("tiktok_connections")
        .select("id, tiktok_email, tiktok_advertiser_id, updated_at")
        .eq("report_id", reportId)
        .maybeSingle();
      return data;
    },
  });

  const connectMut = useMutation({
    mutationFn: () => startOAuth({ data: { reportId } }),
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const isConnected = !!conn;

  return (
    <div className="space-y-4 rounded-xl border border-border/40 bg-background/40 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Music2 className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">TikTok Ads</h3>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Integração com TikTok Ads para relatórios de performance de vídeo e conversões. (TIKTOK_APP_ID é a mesma coisa que Client key?)
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => connectMut.mutate()}
          disabled={connectMut.isPending}
          variant={isConnected ? "outline" : "default"}
          className={!isConnected ? "bg-primary hover:bg-primary/90" : ""}
        >
          {connectMut.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-2 h-4 w-4" />
          )}
          {isConnected ? "Reconectar TikTok" : "Conectar TikTok"}
        </Button>
      </div>

      {isConnected && (
        <div className="flex items-center gap-3 rounded-lg border border-border/30 bg-background/20 p-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-primary">
            <Music2 className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium">TikTok Conectado</p>
            <p className="truncate text-[10px] text-muted-foreground">
              ID: {conn.tiktok_advertiser_id || "Aguardando seleção..."}
            </p>
          </div>
          <Badge
            variant="secondary"
            className="border-none text-[9px] h-4 bg-primary/10 text-primary"
          >
            ATIVO
          </Badge>
        </div>
      )}

      {isLoading && <p className="text-[10px] text-muted-foreground">Verificando conexão…</p>}
    </div>
  );
}

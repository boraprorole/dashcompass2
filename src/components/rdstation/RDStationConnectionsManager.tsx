import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  startRDStationOAuth,
  listRDStationConnections,
  deleteRDStationConnection,
  updateRDStationConnectionSettings,
} from "@/lib/rdstation.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Trash2, Radio } from "lucide-react";

export function RDStationConnectionsManager({ reportId }: { reportId: string }) {
  const startOAuth = useServerFn(startRDStationOAuth);
  const listConns = useServerFn(listRDStationConnections);
  const deleteConn = useServerFn(deleteRDStationConnection);
  const updateSettings = useServerFn(updateRDStationConnectionSettings);
  const qc = useQueryClient();

  const connsQ = useQuery({
    queryKey: ["rd-conns", reportId],
    queryFn: () => listConns({ data: { reportId } }),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["rd-conns", reportId] });

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
      toast.success("Conexão removida.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const settingsMut = useMutation({
    mutationFn: (input: { id: string; show_conversions?: boolean; show_emails?: boolean }) =>
      updateSettings({ data: input }),
    onSuccess: () => {
      toast.success("Preferências atualizadas.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const hasConn = (connsQ.data?.length ?? 0) > 0;

  return (
    <div className="space-y-3 rounded-xl border border-border/40 bg-background/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-medium text-foreground">
          <Radio className="h-3.5 w-3.5 text-primary" /> RD Station Marketing
        </div>
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
          {hasConn ? "Reconectar" : "Conectar RD Station"}
        </Button>
      </div>

      {connsQ.isLoading ? (
        <div className="flex items-center text-xs text-muted-foreground">
          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Carregando...
        </div>
      ) : hasConn ? (
        <ul className="space-y-2">
          {connsQ.data!.map((c) => {
            const exp = new Date(c.expires_at);
            const expired = exp.getTime() < Date.now();
            const showConversions = c.show_conversions !== false;
            const showEmails = c.show_emails !== false;
            return (
              <li
                key={c.id}
                className="space-y-2 rounded-lg border border-border/30 bg-background/50 p-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-medium">
                      {c.account_name ?? "Conta RD Station"}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Token renovado em: {new Date(c.updated_at).toLocaleString("pt-BR")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={expired ? "destructive" : "secondary"} className="text-[10px]">
                      {expired ? "expirado (renova automático)" : "conectado"}
                    </Badge>
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
                </div>
                <div className="flex flex-wrap gap-4 border-t border-border/30 pt-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      id={`conv-${c.id}`}
                      checked={showConversions}
                      disabled={settingsMut.isPending}
                      onCheckedChange={(v) =>
                        settingsMut.mutate({ id: c.id, show_conversions: v })
                      }
                    />
                    <Label htmlFor={`conv-${c.id}`} className="text-[11px] cursor-pointer">
                      Conversões
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id={`email-${c.id}`}
                      checked={showEmails}
                      disabled={settingsMut.isPending}
                      onCheckedChange={(v) =>
                        settingsMut.mutate({ id: c.id, show_emails: v })
                      }
                    />
                    <Label htmlFor={`email-${c.id}`} className="text-[11px] cursor-pointer">
                      E-mail marketing
                    </Label>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">
          Nenhuma conta vinculada. Clique em "Conectar RD Station" para autorizar a conta do
          cliente.
        </p>
      )}
    </div>
  );
}

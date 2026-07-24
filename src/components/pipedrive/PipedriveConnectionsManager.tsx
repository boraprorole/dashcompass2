import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  startPipedriveOAuth,
  listPipedriveConnections,
  deletePipedriveConnection,
} from "@/lib/pipedrive.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2, Briefcase } from "lucide-react";

export function PipedriveConnectionsManager({ reportId }: { reportId: string }) {
  const startOAuth = useServerFn(startPipedriveOAuth);
  const listConns = useServerFn(listPipedriveConnections);
  const deleteConn = useServerFn(deletePipedriveConnection);
  const qc = useQueryClient();

  const connsQ = useQuery({
    queryKey: ["pipedrive-conns", reportId],
    queryFn: () => listConns({ data: { reportId } }),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["pipedrive-conns", reportId] });

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

  const hasConn = (connsQ.data?.length ?? 0) > 0;

  return (
    <div className="space-y-3 rounded-xl border border-border/40 bg-background/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-medium text-foreground">
          <Briefcase className="h-3.5 w-3.5 text-primary" /> Pipedrive CRM
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
          {hasConn ? "Reconectar" : "Conectar Pipedrive"}
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
            return (
              <li
                key={c.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border/30 bg-background/50 p-2"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-medium">
                    {c.pd_user_name ?? c.pd_user_email ?? "Conta Pipedrive"}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {c.company_domain ? `${c.company_domain} · ` : ""}
                    Token expira em: {new Date(c.expires_at).toLocaleString("pt-BR")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={expired ? "destructive" : "secondary"} className="text-[10px]">
                    {expired ? "expirado" : "conectado"}
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
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">
          Nenhuma conta Pipedrive vinculada. Clique em "Conectar Pipedrive" e faça login com um
          usuário do CRM do cliente.
        </p>
      )}
    </div>
  );
}

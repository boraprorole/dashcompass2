import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  supportedConnectors,
  listWindsorAccounts,
  listReportWindsorConnections,
  addReportWindsorConnection,
  deleteReportWindsorConnection,
} from "@/lib/windsor.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Trash2, Link2 } from "lucide-react";

export function WindsorConnectionsManager({ reportId }: { reportId: string }) {
  const listConns = useServerFn(listReportWindsorConnections);
  const listAccounts = useServerFn(listWindsorAccounts);
  const addConn = useServerFn(addReportWindsorConnection);
  const deleteConn = useServerFn(deleteReportWindsorConnection);
  const qc = useQueryClient();

  const [connector, setConnector] = useState<string>("instagram");
  const [accountId, setAccountId] = useState<string>("");

  const connsQ = useQuery({
    queryKey: ["windsor-conns", reportId],
    queryFn: () => listConns({ data: { reportId } }),
  });

  const accountsQ = useQuery({
    queryKey: ["windsor-accounts", connector],
    queryFn: () => listAccounts({ data: { connector } }),
    enabled: !!connector,
    retry: false,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["windsor-conns", reportId] });

  const addMut = useMutation({
    mutationFn: (data: { reportId: string; connector: string; account_id: string; account_name: string | null }) =>
      addConn({ data }),
    onSuccess: () => {
      toast.success("Conta vinculada.");
      setAccountId("");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteConn({ data: { id } }),
    onSuccess: () => {
      toast.success("Vínculo removido.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleAdd = () => {
    if (!accountId) return;
    const acc = accountsQ.data?.find((a) => a.account_id === accountId);
    addMut.mutate({
      reportId,
      connector,
      account_id: accountId,
      account_name: acc?.account_name ?? null,
    });
  };

  const connectorLabel = (id: string) =>
    supportedConnectors.find((c) => c.id === id)?.label ?? id;

  return (
    <div className="space-y-3 rounded-xl border border-border/40 bg-background/40 p-3">
      <div className="flex items-center gap-2 text-xs font-medium text-foreground">
        <Link2 className="h-3.5 w-3.5 text-primary" /> Contas Windsor.ai
      </div>

      {connsQ.isLoading ? (
        <div className="flex items-center text-xs text-muted-foreground">
          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Carregando...
        </div>
      ) : connsQ.data && connsQ.data.length > 0 ? (
        <ul className="space-y-1.5">
          {connsQ.data.map((c) => (
            <li
              key={c.id}
              className="flex items-center gap-2 rounded-lg border border-border/40 bg-background/60 px-2.5 py-1.5"
            >
              <Badge variant="secondary" className="text-[10px]">
                {connectorLabel(c.connector)}
              </Badge>
              <span className="min-w-0 flex-1 truncate text-xs">
                {c.account_name || c.account_id}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-destructive"
                onClick={() => deleteMut.mutate(c.id)}
                disabled={deleteMut.isPending}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">Nenhuma conta vinculada.</p>
      )}

      <div className="flex flex-wrap items-end gap-2 border-t border-border/40 pt-3">
        <div className="flex-1 min-w-[140px] space-y-1">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Fonte
          </label>
          <Select value={connector} onValueChange={(v) => { setConnector(v); setAccountId(""); }}>
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {supportedConnectors.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-[2] min-w-[180px] space-y-1">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Conta
          </label>
          <Select value={accountId} onValueChange={setAccountId} disabled={accountsQ.isLoading || !!accountsQ.error}>
            <SelectTrigger className="h-8">
              <SelectValue placeholder={
                accountsQ.isLoading ? "Carregando..." :
                accountsQ.error ? "Não conectado no Windsor" :
                "Selecione a conta"
              } />
            </SelectTrigger>
            <SelectContent>
              {accountsQ.data?.map((a) => (
                <SelectItem key={a.account_id} value={a.account_id}>
                  {a.account_name || a.account_id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" onClick={handleAdd} disabled={!accountId || addMut.isPending}>
          {addMut.isPending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Plus className="mr-1 h-3.5 w-3.5" />}
          Vincular
        </Button>
      </div>
      {accountsQ.error && (
        <p className="text-[10px] text-muted-foreground">
          Este conector ainda não tem contas conectadas no Windsor.ai. Conecte pelo painel do Windsor primeiro.
        </p>
      )}
    </div>
  );
}

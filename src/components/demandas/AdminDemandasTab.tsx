import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ClipboardList, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { getDemandasEnabled, setDemandasEnabled } from "@/lib/demandas.functions";

export function AdminDemandasTab() {
  const getFn = useServerFn(getDemandasEnabled);
  const setFn = useServerFn(setDemandasEnabled);
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["demandas-enabled"],
    queryFn: () => getFn(),
  });

  const mut = useMutation({
    mutationFn: (enabled: boolean) => setFn({ data: { enabled } }),
    onSuccess: (_, enabled) => {
      toast.success(enabled ? "Demandas ativadas." : "Demandas desativadas.");
      qc.invalidateQueries({ queryKey: ["demandas-enabled"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="glass-strong rounded-3xl p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <ClipboardList className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Demandas</h2>
          <p className="text-xs text-muted-foreground">
            Ative para exibir a aba Demandas no menu lateral de todos os usuários.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-border/50 bg-card/60 p-4">
        <div className="space-y-0.5">
          <Label htmlFor="demandas-switch" className="text-sm font-medium">
            Ativar módulo Demandas
          </Label>
          <p className="text-xs text-muted-foreground">
            Quando desligado, a aba fica oculta para todos.
          </p>
        </div>
        {q.isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <Switch
            id="demandas-switch"
            checked={!!q.data?.enabled}
            disabled={mut.isPending}
            onCheckedChange={(v) => mut.mutate(v)}
          />
        )}
      </div>
    </div>
  );
}

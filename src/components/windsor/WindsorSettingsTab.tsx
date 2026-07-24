import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getWindsorKeyStatus, setWindsorKey, clearWindsorCache } from "@/lib/windsor.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Key, RefreshCw, Save } from "lucide-react";

export function WindsorSettingsTab() {
  const statusFn = useServerFn(getWindsorKeyStatus);
  const saveFn = useServerFn(setWindsorKey);
  const clearFn = useServerFn(clearWindsorCache);
  const qc = useQueryClient();

  const [value, setValue] = useState("");

  const statusQ = useQuery({
    queryKey: ["windsor-key-status"],
    queryFn: () => statusFn(),
  });

  const saveMut = useMutation({
    mutationFn: () => saveFn({ data: { value } }),
    onSuccess: () => {
      toast.success("Chave salva e cache limpo.");
      setValue("");
      qc.invalidateQueries({ queryKey: ["windsor-key-status"] });
      qc.invalidateQueries({ queryKey: ["windsor-accounts"] });
      qc.invalidateQueries({ queryKey: ["windsor-conns"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const clearMut = useMutation({
    mutationFn: () => clearFn(),
    onSuccess: async () => {
      await Promise.all([
        qc.refetchQueries({ queryKey: ["windsor-accounts"] }),
        qc.refetchQueries({ queryKey: ["windsor-conns"] }),
      ]);
      toast.success("Conexões atualizadas.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="glass-strong rounded-3xl p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Key className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Chave Windsor.ai</h2>
            <p className="text-xs text-muted-foreground">
              Configure a API key usada para buscar contas e métricas.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="text-muted-foreground">Status atual:</span>
          {statusQ.isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : statusQ.data?.hasKey ? (
            <>
              <Badge variant="secondary">{statusQ.data.masked}</Badge>
              <span className="text-xs text-muted-foreground">
                fonte: {statusQ.data.source === "database" ? "banco" : "variável de ambiente"}
              </span>
            </>
          ) : (
            <Badge variant="destructive">Não configurada</Badge>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="windsor-key">Nova chave</Label>
          <div className="flex gap-2">
            <Input
              id="windsor-key"
              type="password"
              placeholder="Cole a API key do Windsor.ai"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
            <Button onClick={() => saveMut.mutate()} disabled={!value || saveMut.isPending}>
              {saveMut.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Salvar
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Salvar substitui a chave anterior e limpa o cache automaticamente.
          </p>
        </div>
      </div>

      <div className="glass-strong rounded-3xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <RefreshCw className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Atualizar conexões</h2>
            <p className="text-xs text-muted-foreground">
              Limpa o cache do Windsor e força uma nova busca das contas conectadas.
              Use quando uma conta nova não aparecer nos seletores.
            </p>
          </div>
        </div>
        <Button onClick={() => clearMut.mutate()} disabled={clearMut.isPending} variant="secondary">
          {clearMut.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Atualizar conexões do Windsor
        </Button>
      </div>
    </div>
  );
}

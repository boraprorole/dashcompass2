import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Radio, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getRDStationCredentials,
  setRDStationCredentials,
} from "@/lib/rdstation.functions";

export function AdminRDStationTab() {
  const getFn = useServerFn(getRDStationCredentials);
  const setFn = useServerFn(setRDStationCredentials);
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["rdstation-credentials"],
    queryFn: () => getFn(),
  });

  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");

  useEffect(() => {
    if (q.data) setClientId(q.data.clientId);
  }, [q.data]);

  const mut = useMutation({
    mutationFn: (vars: { clientId: string; clientSecret?: string }) =>
      setFn({ data: vars }),
    onSuccess: () => {
      toast.success("Credenciais salvas.");
      setClientSecret("");
      qc.invalidateQueries({ queryKey: ["rdstation-credentials"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const callbackUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/public/rdstation/oauth/callback`
      : "";

  return (
    <div className="glass-strong rounded-3xl p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Radio className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">RD Station</h2>
          <p className="text-xs text-muted-foreground">
            Cole aqui o Client ID e Client Secret do App criado no publisher da RD Station.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card/60 p-4 space-y-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            URL de Callback (cadastre no App RD Station)
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 truncate rounded-lg bg-background/60 px-3 py-2 text-xs">
              {callbackUrl}
            </code>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => {
                navigator.clipboard.writeText(callbackUrl);
                toast.success("Copiado.");
              }}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!clientId.trim()) {
            toast.error("Informe o Client ID.");
            return;
          }
          mut.mutate({
            clientId: clientId.trim(),
            clientSecret: clientSecret.trim() ? clientSecret.trim() : undefined,
          });
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="rd-client-id">Client ID</Label>
          {q.isLoading ? (
            <div className="flex h-10 items-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando...
            </div>
          ) : (
            <Input
              id="rd-client-id"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="Ex: 1a2b3c4d-5e6f-..."
              autoComplete="off"
            />
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="rd-client-secret">Client Secret</Label>
          <Input
            id="rd-client-secret"
            type="password"
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
            placeholder={
              q.data?.hasClientSecret
                ? `Salvo (${q.data.clientSecretPreview}). Preencha para substituir.`
                : "Cole o Client Secret"
            }
            autoComplete="new-password"
          />
          {q.data?.hasClientSecret && (
            <p className="text-xs text-muted-foreground">
              Um secret já está salvo. Deixe em branco para mantê-lo.
            </p>
          )}
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={mut.isPending}>
            {mut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </div>
      </form>
    </div>
  );
}

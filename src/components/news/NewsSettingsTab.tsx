import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getNewsKeyStatus, setNewsKey } from "@/lib/news-settings.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Newspaper, Save, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function NewsSettingsTab() {
  const statusFn = useServerFn(getNewsKeyStatus);
  const saveFn = useServerFn(setNewsKey);
  const qc = useQueryClient();

  const [value, setValue] = useState("");

  const statusQ = useQuery({
    queryKey: ["news-key-status"],
    queryFn: () => statusFn(),
  });

  const saveMut = useMutation({
    mutationFn: () => saveFn({ data: { value } }),
    onSuccess: () => {
      toast.success("Chave NewsAPI salva com sucesso.");
      setValue("");
      qc.invalidateQueries({ queryKey: ["news-key-status"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const isMissing = statusQ.isSuccess && !statusQ.data?.hasKey;

  return (
    <div className="space-y-6">
      {isMissing && (
        <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 animate-in fade-in slide-in-from-top-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Configuração Pendente</AlertTitle>
          <AlertDescription>
            A chave da NewsAPI ainda não foi configurada. A aba de PR e Clipping não funcionará corretamente até que você insira uma chave válida.
          </AlertDescription>
        </Alert>
      )}

      <div className="glass-strong rounded-3xl p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Newspaper className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Configuração NewsAPI</h2>
            <p className="text-xs text-muted-foreground">
              Insira sua chave de API do <a href="https://newsapi.org/" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">newsapi.org</a> para habilitar o clipping de notícias.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="text-muted-foreground">Status atual:</span>
          {statusQ.isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : statusQ.data?.hasKey ? (
            <>
              <Badge variant="secondary" className="bg-primary/10 text-primary border-none">{statusQ.data.masked}</Badge>
              <span className="text-xs text-muted-foreground">
                fonte: {statusQ.data.source === "database" ? "banco" : "variável de ambiente"}
              </span>
            </>
          ) : (
            <Badge variant="destructive">Não configurada</Badge>
          )}
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="news-key">Sua API Key</Label>
            <div className="flex gap-2">
              <Input
                id="news-key"
                type="password"
                placeholder="Ex: 8a4b..."
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="max-w-md"
              />
              <Button onClick={() => saveMut.mutate()} disabled={!value || saveMut.isPending}>
                {saveMut.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Salvar Chave
              </Button>
            </div>
          </div>

          <div className="rounded-2xl bg-accent/30 p-4 border border-border/40">
            <h4 className="text-xs font-semibold uppercase tracking-wider mb-2">Passo a passo:</h4>
            <ol className="text-xs text-muted-foreground space-y-2 list-decimal ml-4">
              <li>Acesse <a href="https://newsapi.org/register" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">newsapi.org/register</a> e crie sua conta gratuita.</li>
              <li>Copie sua API Key gerada no painel de controle.</li>
              <li>Cole a chave no campo acima e clique em "Salvar Chave".</li>
              <li>Pronto! O módulo de PR agora poderá buscar notícias em tempo real.</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

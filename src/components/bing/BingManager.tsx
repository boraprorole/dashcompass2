import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { connectBing, getBingMetrics } from "@/lib/bing.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ExternalLink, ShieldCheck, AlertCircle, Globe } from "lucide-react";
import { toast } from "sonner";

export function BingManager({ reportId }: { reportId: string }) {
  const [siteUrl, setSiteUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const queryClient = useQueryClient();
  const connect = useServerFn(connectBing);
  const fetchMetrics = useServerFn(getBingMetrics);

  const { data: status, isLoading } = useQuery({
    queryKey: ["bing-status", reportId],
    queryFn: () => fetchMetrics({ data: { reportId } }),
  });

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteUrl) {
      toast.error("Por favor, insira a URL do site");
      return;
    }

    try {
      await connect({ data: { reportId, siteUrl, apiKey } });
      toast.success("Bing Webmaster Tools conectado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["bing-status", reportId] });
    } catch (error) {
      toast.error("Erro ao conectar Bing Webmaster Tools");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (status?.connected) {
    return (
      <Card className="glass-strong border-none rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10 text-blue-500">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Bing Webmaster Tools Conectado</h3>
              <p className="text-sm text-muted-foreground">{status.siteUrl}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`https://www.bing.com/webmasters?siteUrl=${status.siteUrl}`, "_blank")}
          >
            <ExternalLink className="mr-2 h-4 w-4" /> Ver no Bing
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="glass-strong border-none rounded-2xl p-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Globe className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">Conectar Bing Webmaster Tools</h3>
          <p className="text-sm text-muted-foreground">
            Acompanhe o desempenho do seu site no buscador da Microsoft.
          </p>
        </div>
      </div>

      <form onSubmit={handleConnect} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="siteUrl">URL do Site (ex: https://exemplo.com)</Label>
          <Input
            id="siteUrl"
            placeholder="https://suaurl.com"
            value={siteUrl}
            onChange={(e) => setSiteUrl(e.target.value)}
            className="bg-background/20 border-border/30"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="apiKey">API Key (Opcional)</Label>
          <Input
            id="apiKey"
            type="password"
            placeholder="Sua API Key do Bing"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="bg-background/20 border-border/30"
          />
          <p className="text-[10px] text-muted-foreground">
            Você pode obter sua API Key nas configurações do Bing Webmaster Tools.
          </p>
        </div>

        <div className="flex items-start gap-2 rounded-lg bg-yellow-500/10 p-3 text-xs text-yellow-500">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Nota: A integração total via OAuth2 Microsoft está sendo configurada. Por enquanto,
            use a API Key ou apenas informe a URL para monitoramento manual.
          </p>
        </div>

        <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
          Conectar Bing
        </Button>
      </form>
    </Card>
  );
}

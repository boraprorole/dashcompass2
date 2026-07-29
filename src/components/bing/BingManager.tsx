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

        <div className="flex flex-col gap-3 rounded-lg bg-blue-500/10 p-4 text-xs text-blue-400 border border-blue-500/20">
          <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-blue-500">
            <AlertCircle className="h-4 w-4" />
            Passo a Passo para Conexão
          </div>
          <ol className="list-decimal list-inside space-y-2 ml-1">
            <li>Acesse o <a href="https://www.bing.com/webmasters/" target="_blank" rel="noopener" className="underline hover:text-blue-300">Bing Webmaster Tools</a>.</li>
            <li>No canto superior direito, clique na <b>engrenagem (Configurações)</b>.</li>
            <li>Vá em <b>Acesso à API</b> e selecione <b>Chave de API (API Key)</b>.</li>
            <li>Gere e copie sua chave de API.</li>
            <li>Insira a <b>URL exata</b> do site (conforme cadastrada no Bing) e a <b>API Key</b> acima.</li>
          </ol>
          <div className="mt-2 pt-2 border-t border-blue-500/10">
            <p className="font-bold text-blue-500 mb-1">Microsoft OAuth Redirect URI:</p>
            <code className="bg-black/30 px-2 py-1 rounded block break-all text-[9px] select-all">
              {window.location.origin}/api/public/google.oauth.callback
            </code>
            <p className="mt-1 text-[8px] opacity-60">
              * Nota: A integração utiliza o mesmo endpoint unificado para Microsoft e Google.
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-blue-500/10 space-y-3">
            <p className="text-[10px] text-blue-300 font-medium">
              Client ID e Client Secret são globais e devem ser configurados no backend pelo administrador.
            </p>
            <Button 
              type="button" 
              variant="outline" 
              className="w-full border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/20 text-blue-400 text-xs h-8"
              onClick={() => window.open('https://www.dashcompass.com/api/public/google.oauth.callback', '_blank')}
            >
              Conectar via OAuth (Advanced)
            </Button>
          </div>
          <p className="mt-1 text-[10px] opacity-70 italic">
            Nota: A conexão direta via OAuth (Login Microsoft) está em homologação. Utilize a API Key para ativação imediata.
          </p>
        </div>

        <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
          Conectar Bing
        </Button>
      </form>
    </Card>
  );
}

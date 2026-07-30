import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { connectBing, getBingMetrics, getBingConnectUrl, disconnectBing } from "@/lib/bing.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ExternalLink, ShieldCheck, AlertCircle, Globe, Trash2 } from "lucide-react";
import { toast } from "sonner";

export function BingManager({ reportId }: { reportId: string }) {
  const [siteUrl, setSiteUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const queryClient = useQueryClient();
  const connect = useServerFn(connectBing);
  const disconnect = useServerFn(disconnectBing);
  const getConnectUrl = useServerFn(getBingConnectUrl);
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
  
  const handleDisconnect = async () => {
    if (!confirm("Tem certeza que deseja desconectar o Bing Webmaster Tools?")) return;
    
    try {
      await disconnect({ data: { reportId } });
      toast.success("Bing Webmaster Tools desconectado com sucesso");
      queryClient.invalidateQueries({ queryKey: ["bing-status", reportId] });
    } catch (error) {
      toast.error("Erro ao desconectar Bing Webmaster Tools");
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
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`https://www.bing.com/webmasters?siteUrl=${status.siteUrl}`, "_blank")}
            >
              <ExternalLink className="mr-2 h-4 w-4" /> Ver no Bing
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleDisconnect}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
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

      {/* Only show API Key connection if explicitly needed or for non-advanced users */}
      <div className="flex flex-col gap-3 rounded-lg bg-blue-500/10 p-4 text-xs text-blue-400 border border-blue-500/20">
        <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-blue-500">
          <ShieldCheck className="h-4 w-4" />
          Conexão Segura via OAuth
        </div>
        <p className="text-[11px] text-blue-300/80">
          Acesse os dados do Bing Webmaster Tools de forma segura utilizando sua conta do Bing Webmaster.
        </p>
        

        <div className="mt-2 pt-2 border-t border-blue-500/10 space-y-3">
          <Button 
            type="button" 
            className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs h-9"
            onClick={async () => {
              try {
                const url = await getConnectUrl({ data: { reportId } });
                window.location.href = url;
              } catch (e) {
                toast.error("Erro ao gerar URL de autenticação");
              }
            }}
          >
            <Globe className="mr-2 h-4 w-4" />
            Conectar com Bing Webmaster
          </Button>
        </div>
      </div>

      <div className="hidden">
        <form onSubmit={handleConnect} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="siteUrl">URL do Site</Label>
            <Input id="siteUrl" value={siteUrl} onChange={(e) => setSiteUrl(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <Input id="apiKey" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
          </div>
        </form>
      </div>

    </Card>
  );
}

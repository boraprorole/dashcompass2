import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { connectBing, getBingMetrics, getBingConnectUrl, disconnectBing } from "@/lib/bing.functions";
import { listBingSites, chooseBingSite } from "@/lib/bing_picker.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ExternalLink, ShieldCheck, Globe, Trash2 } from "lucide-react";
import { toast } from "sonner";

export function BingManager({ reportId }: { reportId: string }) {
  const queryClient = useQueryClient();
  const disconnect = useServerFn(disconnectBing);
  const getConnectUrl = useServerFn(getBingConnectUrl);
  const fetchMetrics = useServerFn(getBingMetrics);

  const { data: status, isLoading } = useQuery({
    queryKey: ["bing-status", reportId],
    queryFn: () => fetchMetrics({ data: { reportId } }),
  });

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
    const isPending = status.siteUrl === "Aguardando sincronização...";
    return (
      <Card className="glass-strong border-none rounded-2xl p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10 text-blue-500">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Bing Webmaster Tools</h3>
                <p className="text-sm text-muted-foreground">
                  {isPending ? "Conectado · Escolha o site abaixo" : status.siteUrl}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {!isPending && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`https://www.bing.com/webmasters?siteUrl=${status.siteUrl}`, "_blank")}
                >
                  <ExternalLink className="mr-2 h-4 w-4" /> Ver no Bing
                </Button>
              )}
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
          
          <BingSitePicker reportId={reportId} onSaved={() => queryClient.invalidateQueries({ queryKey: ["bing-status", reportId] })} />
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
    </Card>
  );
}

function BingSitePicker({ reportId, onSaved }: { reportId: string; onSaved: () => void }) {
  const list = useServerFn(listBingSites);
  const choose = useServerFn(chooseBingSite);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["bing-sites", reportId],
    queryFn: () => list({ data: { reportId } }),
    staleTime: 0,
  });

  const mut = useMutation({
    mutationFn: (siteUrl: string) => choose({ data: { reportId, siteUrl } }),
    onSuccess: () => {
      toast.success("Site do Bing vinculado");
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <PickerSkeleton label="Carregando sites…" />;
  if (error) return (
    <div className="space-y-2">
      <PickerError message={(error as Error).message} />
      <Button 
        variant="outline" 
        size="sm" 
        className="w-full text-[10px] h-7"
        onClick={() => refetch()}
      >
        Tentar novamente
      </Button>
    </div>
  );

  const current = data?.current && data.current !== "Aguardando sincronização..." ? data.current : undefined;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Escolher Propriedade do Bing</p>
        {current && (
          <Badge variant="secondary" className="bg-primary/10 text-primary border-none text-[9px] h-4">
            OK
          </Badge>
        )}
      </div>
      <Select value={current} onValueChange={(v) => mut.mutate(v)} disabled={mut.isPending}>
        <SelectTrigger className="h-9 text-xs bg-background/40 border-white/10">
          <SelectValue placeholder="Escolher site no Bing" />
        </SelectTrigger>
        <SelectContent>
          {(data?.sites ?? []).map((s: any) => (
            <SelectItem key={s.siteUrl} value={s.siteUrl} className="text-xs">
              {s.siteUrl}
            </SelectItem>
          ))}
          {(data?.sites?.length ?? 0) === 0 && (
            <div className="p-2 text-[10px] text-muted-foreground text-center">Nenhum site encontrado nesta conta.</div>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}

function PickerSkeleton({ label }: { label: string }) {
  return (
    <div className="flex h-9 items-center gap-2 rounded-md border border-white/10 bg-background/40 px-2 text-[10px] text-muted-foreground">
      <Loader2 className="h-3 w-3 animate-spin" /> {label}
    </div>
  );
}

function PickerError({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1 text-[10px] text-destructive">
      {message}
    </div>
  );
}

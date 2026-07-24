import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { startGoogleUnifiedOAuth } from "@/lib/google_unified.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, LineChart, Search, Presentation } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function GoogleUnifiedManager({ reportId }: { reportId: string }) {
  const startOAuth = useServerFn(startGoogleUnifiedOAuth);
  const qc = useQueryClient();

  const { data: conns, isLoading } = useQuery({
    queryKey: ["google-unified-conns", reportId],
    queryFn: async () => {
      const [ga, gsc, gads] = await Promise.all([
        supabase.from("ga_connections").select("id, google_email").eq("report_id", reportId),
        supabase.from("gsc_connections").select("id, google_email").eq("report_id", reportId),
        supabase.from("google_ads_connections").select("id, google_email").eq("report_id", reportId),
      ]);
      return {
        ga: ga.data || [],
        gsc: gsc.data || [],
        gads: gads.data || [],
      };
    },
  });

  const connectMut = useMutation({
    mutationFn: () => startOAuth({ data: { reportId } }),
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const isConnected = conns && (conns.ga.length > 0 || conns.gsc.length > 0 || conns.gads.length > 0);

  return (
    <div className="space-y-4 rounded-xl border border-border/40 bg-background/40 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold">Google Ecosystem</h3>
          <p className="text-[11px] text-muted-foreground">GA4, Search Console e Google Ads em uma única conexão.</p>
        </div>
        <Button
          size="sm"
          onClick={() => connectMut.mutate()}
          disabled={connectMut.isPending}
          className="bg-primary hover:bg-primary/90"
        >
          {connectMut.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-2 h-4 w-4" />
          )}
          {isConnected ? "Atualizar Conexão" : "Conectar Google"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatusCard 
          icon={<LineChart className="h-4 w-4" />} 
          label="GA4" 
          connected={!!conns?.ga.length} 
          email={conns?.ga[0]?.google_email} 
        />
        <StatusCard 
          icon={<Search className="h-4 w-4" />} 
          label="Search Console" 
          connected={!!conns?.gsc.length} 
          email={conns?.gsc[0]?.google_email} 
        />
        <StatusCard 
          icon={<Presentation className="h-4 w-4" />} 
          label="Google Ads" 
          connected={!!conns?.gads.length} 
          email={conns?.gads[0]?.google_email} 
        />
      </div>
    </div>
  );
}

function StatusCard({ icon, label, connected, email }: { icon: React.ReactNode; label: string; connected: boolean; email?: string | null }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/30 bg-background/20 p-3">
      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${connected ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium">{label}</p>
        <p className="truncate text-[10px] text-muted-foreground">
          {connected ? (email || "Conectado") : "Não conectado"}
        </p>
      </div>
      {connected && (
        <Badge variant="secondary" className="bg-primary/10 text-primary border-none text-[9px] h-4">
          OK
        </Badge>
      )}
    </div>
  );
}

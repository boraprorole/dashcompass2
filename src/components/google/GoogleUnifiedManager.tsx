import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { startGoogleUnifiedOAuth } from "@/lib/google_unified.functions";
import {
  listGa4Properties,
  chooseGa4Property,
  listGscSites,
  chooseGscSite,
  listGoogleAdsCustomers,
  chooseGoogleAdsCustomer,
} from "@/lib/google_picker.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, LineChart, Search, Presentation } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function GoogleUnifiedManager({ reportId }: { reportId: string }) {
  const startOAuth = useServerFn(startGoogleUnifiedOAuth);
  const qc = useQueryClient();

  const { data: conns, isLoading } = useQuery({
    queryKey: ["google-unified-conns", reportId],
    queryFn: async () => {
      const [ga, gsc, gads] = await Promise.all([
        supabase.from("ga_connections").select("id, google_email, ga_property_id, updated_at").eq("report_id", reportId).order("updated_at", { ascending: false }),
        supabase.from("gsc_connections").select("id, google_email, site_url, type, updated_at").eq("report_id", reportId).order("updated_at", { ascending: false }),
        supabase.from("google_ads_connections").select("id, google_email, customer_id, updated_at").eq("report_id", reportId).order("updated_at", { ascending: false }),
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
  const gaConn = conns?.ga[0];
  const gscConn = conns?.gsc[0];
  const gadsConn = conns?.gads[0];

  return (
    <div className="space-y-4 rounded-xl border border-border/40 bg-background/40 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold">Google Ecosystem</h3>
          <p className="text-[11px] text-muted-foreground">
            GA4, Search Console e Google Ads em uma única conexão. Após conectar, escolha a
            conta/propriedade de cada serviço para vincular ao relatório.
          </p>
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
          {isConnected ? "Reconectar Google" : "Conectar Google"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <ServiceCard
          icon={<LineChart className="h-4 w-4" />}
          label="GA4"
          email={gaConn?.google_email}
          connected={!!gaConn}
          selected={gaConn?.ga_property_id && gaConn.ga_property_id !== "PENDING" ? gaConn.ga_property_id : undefined}
          picker={gaConn ? <GaPicker reportId={reportId} onSaved={() => qc.invalidateQueries({ queryKey: ["google-unified-conns", reportId] })} /> : null}
        />
        <ServiceCard
          icon={<Search className="h-4 w-4" />}
          label="Search Console (Web)"
          email={gscConn?.google_email}
          connected={!!gscConn}
          selected={conns?.gsc.find(c => c.type === 'web')?.site_url ?? undefined}
          picker={gscConn ? <GscPicker reportId={reportId} type="web" placeholder="Escolher site (Web)" onSaved={() => qc.invalidateQueries({ queryKey: ["google-unified-conns", reportId] })} /> : null}
        />
        <ServiceCard
          icon={<Search className="h-4 w-4 text-[#ff0050]" />}
          label="Search Console (TikTok)"
          email={conns?.gsc.find(c => c.type === 'tiktok')?.google_email || gscConn?.google_email}
          connected={!!gscConn}
          selected={conns?.gsc.find(c => c.type === 'tiktok')?.site_url ?? undefined}
          picker={gscConn ? <GscPicker reportId={reportId} type="tiktok" placeholder="Escolher perfil TikTok" onSaved={() => qc.invalidateQueries({ queryKey: ["google-unified-conns", reportId] })} /> : null}
        />
        <ServiceCard
          icon={<Search className="h-4 w-4 text-[#E1306C]" />}
          label="Search Console (Instagram)"
          email={conns?.gsc.find(c => c.type === 'instagram')?.google_email || gscConn?.google_email}
          connected={!!gscConn}
          selected={conns?.gsc.find(c => c.type === 'instagram')?.site_url ?? undefined}
          picker={gscConn ? <GscPicker reportId={reportId} type="instagram" placeholder="Escolher perfil Instagram" onSaved={() => qc.invalidateQueries({ queryKey: ["google-unified-conns", reportId] })} /> : null}
        />
        <ServiceCard
          icon={<Presentation className="h-4 w-4" />}
          label="Google Ads"
          email={gadsConn?.google_email}
          connected={!!gadsConn}
          selected={gadsConn?.customer_id ?? undefined}
          picker={gadsConn ? <GadsPicker reportId={reportId} onSaved={() => qc.invalidateQueries({ queryKey: ["google-unified-conns", reportId] })} /> : null}
        />
      </div>
      {isLoading && <p className="text-[10px] text-muted-foreground">Carregando conexões…</p>}
    </div>
  );
}

function ServiceCard({
  icon,
  label,
  email,
  connected,
  selected,
  picker,
}: {
  icon: React.ReactNode;
  label: string;
  email?: string | null;
  connected: boolean;
  selected?: string;
  picker: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border/30 bg-background/20 p-3">
      <div className="flex items-center gap-3">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${connected ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium">{label}</p>
          <p className="truncate text-[10px] text-muted-foreground">
            {connected ? email || "Conectado" : "Não conectado"}
          </p>
        </div>
        {connected && (
          <Badge
            variant="secondary"
            className={`border-none text-[9px] h-4 ${selected ? "bg-primary/10 text-primary" : "bg-amber-500/10 text-amber-500"}`}
          >
            {selected ? "OK" : "Escolher"}
          </Badge>
        )}
      </div>
      {picker}
    </div>
  );
}

function GaPicker({ reportId, onSaved }: { reportId: string; onSaved: () => void }) {
  const qc = useQueryClient();
  const list = useServerFn(listGa4Properties);
  const choose = useServerFn(chooseGa4Property);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["ga4-properties", reportId],
    queryFn: () => list({ data: { reportId } }),
    staleTime: 0, // Ensure we check for fresh data
  });
  const mut = useMutation({
    mutationFn: (propertyId: string) => choose({ data: { reportId, propertyId } }),
    onSuccess: () => {
      toast.success("Propriedade GA4 vinculada");
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  if (isLoading) return <PickerSkeleton label="Carregando propriedades…" />;
  if (error) return (
    <div className="space-y-2">
      <PickerError message={(error as Error).message} />
      <Button 
        variant="outline" 
        size="sm" 
        className="w-full text-[10px] h-7"
        onClick={() => {
          qc.invalidateQueries({ queryKey: ["ga4-properties", reportId] });
          refetch();
        }}
      >
        Tentar novamente
      </Button>
    </div>
  );
  const current = data?.current && data.current !== "PENDING" ? data.current : undefined;
  return (
    <Select value={current} onValueChange={(v) => mut.mutate(v)} disabled={mut.isPending}>
      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Escolher propriedade GA4" /></SelectTrigger>
      <SelectContent>
        {(data?.properties ?? []).map((p) => (
          <SelectItem key={p.propertyId} value={p.propertyId} className="text-xs">
            {p.displayName} · {p.account}
          </SelectItem>
        ))}
        {(data?.properties?.length ?? 0) === 0 && (
          <div className="p-2 text-[10px] text-muted-foreground">Nenhuma propriedade encontrada.</div>
        )}
      </SelectContent>
    </Select>
  );
}

function GscPicker({ reportId, type = 'web', placeholder, onSaved }: { reportId: string; type?: string; placeholder: string; onSaved: () => void }) {
  const list = useServerFn(listGscSites);
  const choose = useServerFn(chooseGscSite);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["gsc-sites", reportId, type],
    queryFn: () => list({ data: { reportId } }),
    staleTime: 0,
  });
  const mut = useMutation({
    mutationFn: (siteUrl: string) => choose({ data: { reportId, siteUrl, type } }),
    onSuccess: () => {
      toast.success(`Search Console (${type}) vinculado`);
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
  
  const current = (data as any)?.connections?.find((c: any) => c.type === type)?.site_url;
  
  const filteredSites = (data?.sites ?? []).filter(s => {
    const url = s.siteUrl.toLowerCase();
    if (type === 'tiktok') return url.includes('tiktok.com');
    if (type === 'instagram') return url.includes('instagram.com') || url.includes('threads.net');
    // For web, we show everything that is NOT clearly TikTok or Instagram to keep it clean, 
    // or just show everything if the user prefers. Let's show everything for web as fallback.
    return true; 
  });
    <Select value={current} onValueChange={(v) => mut.mutate(v)} disabled={mut.isPending}>
      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        {(data?.sites ?? []).map((s) => (
          <SelectItem key={s.siteUrl} value={s.siteUrl} className="text-xs">
            {s.siteUrl}
          </SelectItem>
        ))}
        {(data?.sites?.length ?? 0) === 0 && (
          <div className="p-2 text-[10px] text-muted-foreground">Nenhum site encontrado.</div>
        )}
      </SelectContent>
    </Select>
  );
}

function GadsPicker({ reportId, onSaved }: { reportId: string; onSaved: () => void }) {
  const list = useServerFn(listGoogleAdsCustomers);
  const choose = useServerFn(chooseGoogleAdsCustomer);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["gads-customers", reportId],
    queryFn: () => list({ data: { reportId } }),
    staleTime: 0,
  });
  const mut = useMutation({
    mutationFn: (customerId: string) => choose({ data: { reportId, customerId } }),
    onSuccess: () => {
      toast.success("Conta do Google Ads vinculada");
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  if (isLoading) return <PickerSkeleton label="Carregando contas…" />;
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
  return (
    <Select value={data?.current ?? undefined} onValueChange={(v) => mut.mutate(v)} disabled={mut.isPending}>
      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Escolher conta do Google Ads" /></SelectTrigger>
      <SelectContent>
        {(data?.customers ?? []).map((c) => (
          <SelectItem key={c.customerId} value={c.customerId} className="text-xs">
            {c.descriptiveName} · {c.customerId}
          </SelectItem>
        ))}
        {(data?.customers?.length ?? 0) === 0 && (
          <div className="p-2 text-[10px] text-muted-foreground">Nenhuma conta acessível.</div>
        )}
      </SelectContent>
    </Select>
  );
}

function PickerSkeleton({ label }: { label: string }) {
  return (
    <div className="flex h-8 items-center gap-2 rounded-md border border-border/30 bg-background/40 px-2 text-[10px] text-muted-foreground">
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

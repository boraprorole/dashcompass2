import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import type { DateRange } from "react-day-picker";
import {
  getReportWindsorMetrics,
  getReportInstagramTopPosts,
  getReportInstagramAudience,
  getReportSearchConsoleTop,
  getReportSearchConsoleYoY,
  getReportSearchConsoleMonthlyYTD,
  getReportMetaAdsCreatives,
  supportedConnectors,
} from "@/lib/windsor.functions";
import { getGaMetrics } from "@/lib/ga.functions";
import { getReportEmv } from "@/lib/emv.functions";
import { getRDStationMetrics } from "@/lib/rdstation.functions";
import { getReportTiktokMetrics } from "@/lib/tiktok.functions";
import { hasPipedriveConnection } from "@/lib/pipedrive.functions";
import { PipedriveCrmPanel } from "@/components/pipedrive/PipedriveCrmPanel";
import { GoogleAdsCsvPanel } from "@/components/googleads/GoogleAdsCsvPanel";
import { UnorteMetaCsvPanel } from "@/components/meta/UnorteMetaCsvPanel";
import { UnorteGoogleAdsCsvPanel } from "@/components/google/UnorteGoogleAdsCsvPanel";
import { UnorteCrmCsvPanel } from "@/components/crm/UnorteCrmCsvPanel";
import { UnorteAnaliseGeralPanel } from "@/components/analysis/UnorteAnaliseGeralPanel";
import { GoogleAdsPanel } from "@/components/google/GoogleAdsPanel";
import { GoogleSearchConsolePanel } from "@/components/google/GoogleSearchConsolePanel";
import { listGoogleAdsDatasets } from "@/lib/googleads-csv.functions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon, Bookmark, Eye, Heart, Instagram, MessageCircle, Share2, ExternalLink, Sparkles, Video, Music2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  ArrowDownRight,
  ArrowUpRight,
  Loader2,
  Minus,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";


const METRIC_LABELS: Record<string, string> = {
  // Instagram
  followers_count: "Seguidores",
  follows_count: "Seguindo",
  media_count: "Publicações",
  reach: "Alcance",
  impressions: "Impressões",
  views: "Views",
  profile_views: "Visitas ao perfil",
  website_clicks: "Cliques no site",
  accounts_engaged: "Contas engajadas",
  total_interactions: "Interações totais",
  likes: "Curtidas",
  comments: "Comentários",
  saves: "Salvamentos",
  shares: "Compartilhamentos",
  replies: "Respostas",
  video_views: "Views de vídeo",
  videos: "Vídeos no período",
  video_count: "Vídeos publicados",
  follower_count: "Seguidores",
  following_count: "Seguindo",
  likes_count: "Curtidas totais",
  reel_plays: "Plays de Reels",
  // Facebook
  page_fans: "Fãs da página",
  page_impressions: "Impressões",
  page_reach: "Alcance",
  page_engaged_users: "Usuários engajados",
  page_post_engagements: "Engajamentos em posts",
  page_video_views: "Views de vídeo",
  page_views_total: "Visitas à página",
  // Ads
  spend: "Investimento",
  cost: "Investimento",
  clicks: "Cliques",
  ctr: "CTR",
  cpc: "CPC",
  cpm: "CPM",
  average_cpc: "CPC médio",
  average_cpm: "CPM médio",
  frequency: "Frequência",
  conversions: "Conversões",
  conversion_value: "Valor de conversão",
  cost_per_conversion: "Custo por conversão",
  all_conversions: "Todas as conversões",
  leads: "Leads",
  cost_per_lead: "Custo por lead",
  actions_lead: "Leads gerados",
  cost_per_action_type_lead: "Custo por lead",
  roas: "ROAS",
  search_impression_share: "Share de impressões",
  video_p25_watched: "Vídeo 25%",
  video_p50_watched: "Vídeo 50%",
  video_p75_watched: "Vídeo 75%",
  video_p100_watched: "Vídeo 100%",
  video_views_p25: "Vídeo 25%",
  video_views_p50: "Vídeo 50%",
  video_views_p75: "Vídeo 75%",
  video_views_p100: "Vídeo 100%",
  follows: "Novos seguidores",
  profile_visits: "Visitas ao perfil",
  reactions: "Reações",
  // GA4
  sessions: "Sessões",
  users: "Usuários",
  newUsers: "Novos usuários",
  activeUsers: "Usuários ativos",
  screenPageViews: "Visualizações",
  engagementRate: "Taxa de engajamento",
  averageSessionDuration: "Duração média",
  bounceRate: "Taxa de rejeição",
  eventCount: "Eventos",
  totalRevenue: "Receita",
  // Derived
  engagement_rate: "Taxa de engajamento",
  save_rate: "Taxa de salvamento",
  share_rate: "Taxa de compartilhamento",
  profile_ctr: "CTR do perfil",
  reel_hold_rate: "Retenção de Reels",
  cpa_calc: "Custo por aquisição",
  roas_calc: "Retorno sobre investimento",
  cost_per_engaged: "Custo por engajado",
  video_retention: "Retenção de vídeo",
  pages_per_session: "Páginas por sessão",
  conversion_rate: "Taxa de conversão",
  revenue_per_user: "Receita por usuário",
  leads_calc: "Leads (estimado)",
};

const PERCENT_FIELDS = new Set([
  "ctr", "engagementRate", "bounceRate", "search_impression_share",
  "engagement_rate", "save_rate", "share_rate", "profile_ctr",
  "reel_hold_rate", "video_retention", "conversion_rate",
]);
const CURRENCY_FIELDS = new Set([
  "spend", "cost", "cpc", "average_cpc", "cpm", "average_cpm",
  "cost_per_conversion", "conversion_value", "totalRevenue", "cost_per_lead", "cost_per_action_type_lead",
  "cpa_calc", "cost_per_engaged", "revenue_per_user",
]);
const RATIO_FIELDS = new Set(["roas", "roas_calc", "frequency", "pages_per_session"]);
const SNAPSHOT_FIELDS = new Set(["followers_count", "follows_count", "media_count", "page_fans"]);

// Priority order for KPI cards per connector
const PRIMARY_FIELDS: Record<string, string[]> = {
  instagram: ["followers_count", "reach", "views", "accounts_engaged", "total_interactions", "profile_views", "website_clicks"],
  facebook: ["page_fans", "page_reach", "page_impressions", "page_engaged_users", "page_post_engagements", "page_views_total"],
  facebook_ads: ["ctr", "cpm", "cost_per_action_type_lead", "actions_lead", "cpc", "spend", "reach", "impressions", "clicks", "conversions", "roas"],
  adwords: ["cost", "impressions", "clicks", "ctr", "average_cpc", "conversions", "conversion_value", "cost_per_conversion"],
  google_ads: ["cost", "impressions", "clicks", "ctr", "average_cpc", "conversions", "conversion_value", "cost_per_conversion"],
  ga4: ["users", "sessions", "screenPageViews", "engagementRate", "conversions", "totalRevenue"],
  tiktok: ["spend", "reach", "impressions", "clicks", "video_views", "ctr", "cpm", "follows"],
  tiktok_oauth: ["follower_count", "video_views", "likes", "comments", "shares", "videos"],
  linkedin: ["cost", "impressions", "clicks", "ctr", "reactions", "shares", "follows", "video_views"],
};

const DERIVED_FIELDS: Record<string, string[]> = {
  instagram: ["engagement_rate", "save_rate", "share_rate", "profile_ctr", "reel_hold_rate"],
  facebook_ads: ["leads_calc", "roas_calc", "cpa_calc", "cost_per_engaged", "video_retention"],
  adwords: ["roas_calc", "cpa_calc"],
  tiktok: ["cpa_calc", "video_retention"],
  tiktok_oauth: ["engagement_rate"],
  linkedin: ["cpa_calc"],
  ga4: ["conversion_rate", "pages_per_session", "revenue_per_user"],
};

const DATE_PRESETS = [
  { id: "last_7d", label: "Últimos 7 dias" },
  { id: "last_30d", label: "Últimos 30 dias" },
  { id: "last_90d", label: "Últimos 90 dias" },
  { id: "last_180d", label: "Últimos 180 dias" },
  { id: "last_12m", label: "Últimos 12 meses" },
  { id: "last_16m", label: "Últimos 16 meses" },
  { id: "this_month", label: "Este mês" },
  { id: "last_month", label: "Mês passado" },
  { id: "custom", label: "Personalizado" },
];

function formatValue(field: string, value: number | string | null | undefined): string {
  if (value == null) return "—";
  if (typeof value === "string") return value;
  if (PERCENT_FIELDS.has(field)) return `${value.toFixed(2)}%`;
  if (RATIO_FIELDS.has(field)) return `${value.toFixed(2)}x`;
  if (CURRENCY_FIELDS.has(field)) {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });
  }
  if (Number.isInteger(value)) return value.toLocaleString("pt-BR");
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

function formatCompact(value: number): string {
  if (Math.abs(value) >= 1000) {
    return new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(value);
  }
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

function formatDate(d: string): string {
  const [_, m, day] = d.split("-");
  return `${day}/${m}`;
}

function normalizeRange(r: DateRange): DateRange {
  if (r.from && r.to && r.from > r.to) {
    return { from: r.to, to: r.from };
  }
  return r;
}

function delta(curr: number | null | undefined, prev: number | null | undefined) {
  if (curr == null || prev == null || prev === 0) return null;
  return ((curr - prev) / Math.abs(prev)) * 100;
}

function DeltaBadge({ value }: { value: number | null }) {
  if (value == null) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
        <Minus className="h-3 w-3" /> —
      </span>
    );
  }
  const up = value >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-1 text-[11px] font-bold ${
        up ? "bg-black/10 text-black" : "bg-black/20 text-black"
      }`}
    >
      <Icon className="h-3 w-3" />
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

export function ReportMetricsPanel({ reportId }: { reportId: string }) {
  const fetchMetrics = useServerFn(getReportWindsorMetrics);
  const fetchTopPosts = useServerFn(getReportInstagramTopPosts);
  const fetchAudience = useServerFn(getReportInstagramAudience);
  const [datePreset, setDatePreset] = useState("last_30d");
  const [range, setRange] = useState<DateRange | undefined>();
  const [draftRange, setDraftRange] = useState<DateRange | undefined>();
  const [isSelectingCustomRange, setIsSelectingCustomRange] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [sortBy, setSortBy] = useState<"engagement" | "reach" | "likes" | "views">("engagement");

  const customPending =
    datePreset === "custom" && !(range?.from && range?.to);

  const rangeArgs = useMemo(() => {
    if (datePreset === "custom" && range?.from && range?.to) {
      return { dateFrom: format(range.from, "yyyy-MM-dd"), dateTo: format(range.to, "yyyy-MM-dd") };
    }
    if (datePreset === "this_month") {
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      return { dateFrom: format(from, "yyyy-MM-dd"), dateTo: format(now, "yyyy-MM-dd") };
    }
    if (datePreset === "last_month") {
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const to = new Date(now.getFullYear(), now.getMonth(), 0);
      return { dateFrom: format(from, "yyyy-MM-dd"), dateTo: format(to, "yyyy-MM-dd") };
    }
    return { datePreset };
  }, [datePreset, range]);

  const rangeKey = JSON.stringify(rangeArgs);

  const q = useQuery({
    queryKey: ["report-metrics", reportId, rangeKey],
    queryFn: () => fetchMetrics({ data: { reportId, ...rangeArgs } }),
    retry: false,
    enabled: !customPending,
  });

  const fetchTiktok = useServerFn(getReportTiktokMetrics);
  const tiktokQ = useQuery({
    queryKey: ["report-tiktok-oauth", reportId, rangeKey],
    queryFn: () => fetchTiktok({ data: { reportId, ...rangeArgs, sortBy } }),
    retry: false,
    enabled: !customPending,
  });

  const topPostsQ = useQuery({
    queryKey: ["report-top-posts", reportId, rangeKey, sortBy],
    queryFn: () => fetchTopPosts({ data: { reportId, ...rangeArgs, limit: 6, sortBy } }),
    retry: false,
    enabled: !customPending && !!q.data && q.data.some((g) => g.connector === "instagram"),
  });

  const audienceQ = useQuery({
    queryKey: ["report-audience", reportId],
    queryFn: () => fetchAudience({ data: { reportId } }),
    retry: false,
    enabled: !customPending && !!q.data && q.data.some((g) => g.connector === "instagram"),
  });

  const fetchSearchConsole = useServerFn(getReportSearchConsoleTop);
  const { data: gscUnifiedConn } = useQuery({
    queryKey: ["gsc-unified-conn", reportId],
    queryFn: async () => {
      const { data } = await supabase.from("gsc_connections" as any).select("id").eq("report_id", reportId).maybeSingle();
      return data;
    }
  });
  const { data: gadsUnifiedConn } = useQuery({
    queryKey: ["gads-unified-conn", reportId],
    queryFn: async () => {
      const { data } = await supabase.from("google_ads_connections" as any).select("id").eq("report_id", reportId).maybeSingle();
      return data;
    }
  });
  const searchConsoleQ = useQuery({
    queryKey: ["report-searchconsole-top", reportId, rangeKey],
    queryFn: () => fetchSearchConsole({ data: { reportId, ...rangeArgs, limit: 10 } }),
    retry: false,
    enabled: !customPending && !!q.data && q.data.some((g) => g.connector === "searchconsole"),
  });

  const fetchSearchConsoleYoY = useServerFn(getReportSearchConsoleYoY);
  const searchConsoleYoYQ = useQuery({
    queryKey: ["report-searchconsole-yoy", reportId, rangeKey],
    queryFn: () => fetchSearchConsoleYoY({ data: { reportId, ...rangeArgs } }),
    retry: false,
    enabled: !customPending && !!q.data && q.data.some((g) => g.connector === "searchconsole"),
  });

  const fetchSearchConsoleMonthly = useServerFn(getReportSearchConsoleMonthlyYTD);
  const searchConsoleMonthlyQ = useQuery({
    queryKey: ["report-searchconsole-monthly", reportId, rangeKey],
    queryFn: () => fetchSearchConsoleMonthly({ data: { reportId, ...rangeArgs } }),
    retry: false,
    enabled: !customPending && !!q.data && q.data.some((g) => g.connector === "searchconsole"),
  });

  const fetchEmv = useServerFn(getReportEmv);
  const emvQ = useQuery({
    queryKey: ["report-emv", reportId, rangeKey],
    queryFn: () => fetchEmv({ data: { reportId, ...rangeArgs } }),
    retry: false,
    enabled: !customPending && !!q.data && q.data.some((g) => g.connector === "searchconsole"),
  });



  const fetchMetaCreatives = useServerFn(getReportMetaAdsCreatives);
  const metaCreativesQ = useQuery({
    queryKey: ["report-meta-creatives", reportId, rangeKey],
    queryFn: () => fetchMetaCreatives({ data: { reportId, ...rangeArgs, limit: 20 } }),
    retry: false,
    enabled: !customPending && !!q.data && q.data.some((g) => g.connector === "facebook_ads"),
  });

  const gaRange = useMemo<"7d" | "28d" | "90d" | "thisMonth" | "lastMonth">(() => {
    if (datePreset === "last_7d") return "7d";
    if (datePreset === "last_90d") return "90d";
    if (datePreset === "this_month") return "thisMonth";
    if (datePreset === "last_month") return "lastMonth";
    return "28d";
  }, [datePreset]);

  const fetchGa = useServerFn(getGaMetrics);
  const gaArgs = useMemo(() => {
    if (datePreset === "custom" && range?.from && range?.to) {
      return {
        dateFrom: format(range.from, "yyyy-MM-dd"),
        dateTo: format(range.to, "yyyy-MM-dd"),
      } as const;
    }
    return { range: gaRange } as const;
  }, [datePreset, range, gaRange]);
  const gaQ = useQuery({
    queryKey: ["report-ga", reportId, gaArgs],
    queryFn: () => fetchGa({ data: { reportId, ...gaArgs } }),
    retry: false,
    enabled: !customPending,
  });

  const hasGa = !!gaQ.data && gaQ.data.properties.length > 0;

  const fetchRd = useServerFn(getRDStationMetrics);
  const rdArgs = useMemo(() => {
    if (datePreset === "custom" && range?.from && range?.to) {
      return {
        customDates: {
          start_date: format(range.from, "yyyy-MM-dd"),
          end_date: format(range.to, "yyyy-MM-dd"),
        },
      } as const;
    }
    return { range: gaRange } as const;
  }, [datePreset, range, gaRange]);
  const rdQ = useQuery({
    queryKey: ["report-rd", reportId, JSON.stringify(rdArgs)],
    queryFn: () => fetchRd({ data: { reportId, ...rdArgs } }),
    retry: false,
    enabled: !customPending,
  });
  const hasRd = !!rdQ.data && rdQ.data.connected === true;

  const fetchPdConn = useServerFn(hasPipedriveConnection);
  const pdConnQ = useQuery({
    queryKey: ["report-pd-connected", reportId],
    queryFn: () => fetchPdConn({ data: { reportId } }),
    retry: false,
  });
  const hasPipedrive = !!pdConnQ.data?.connected;

  const listGadsCsvFn = useServerFn(listGoogleAdsDatasets);
  const gadsCsvQ = useQuery({
    queryKey: ["gads-csv-report", reportId],
    queryFn: () => listGadsCsvFn({ data: { reportId } }),
    retry: false,
  });
  const hasGadsCsv = (gadsCsvQ.data ?? []).length > 0;

  if (q.isLoading || tiktokQ.isLoading) {
    return (
      <div className="glass-strong flex items-center justify-center rounded-3xl p-6 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando métricas...
      </div>
    );
  }

  const hasWindsor = !!q.data && q.data.length > 0;
  const hasTiktok = !!tiktokQ.data && tiktokQ.data.length > 0;
  const isUnorteMetaCsv = reportId === "1231f578-3057-4167-a705-5c45b526bf53";
  if (!customPending && !hasWindsor && !hasTiktok && !hasGa && !hasRd && !hasPipedrive && !hasGadsCsv && !isUnorteMetaCsv) return null;



  const connectorLabel = (id: string) =>
    id === "tiktok_oauth" ? "TikTok" : supportedConnectors.find((c) => c.id === id)?.label ?? id;

  const rangeLabel = (() => {
    if (datePreset !== "custom") return "Selecionar período";
    if (draftRange?.from && !draftRange.to) return `${format(draftRange.from, "dd/MM/yy")} — Data final`;
    if (range?.from && range?.to) return `${format(range.from, "dd/MM/yy")} — ${format(range.to, "dd/MM/yy")}`;
    return "Selecionar período";
  })();

  return (
    <div className="glass-strong space-y-5 rounded-3xl p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="rounded-xl bg-primary/10 p-2 text-primary">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold leading-tight">Dashboard de Performance</h2>
            <p className="text-[11px] text-muted-foreground">
              Dados em tempo real · {hasGa || gscUnifiedConn || gadsUnifiedConn ? "Google oAuth" : "Windsor.ai"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={datePreset}
            onValueChange={(v) => {
              setDatePreset(v);
              if (v === "custom") {
                setRange(undefined);
                setDraftRange(undefined);
                setIsSelectingCustomRange(false);
                setCustomOpen(true);
              } else {
                setDraftRange(undefined);
                setIsSelectingCustomRange(false);
                setCustomOpen(false);
              }
            }}
          >
            <SelectTrigger className="h-9 w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_PRESETS.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {datePreset === "custom" && (
            <Popover open={customOpen} onOpenChange={setCustomOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("h-9 justify-start gap-2 text-left font-normal", !range?.from && "text-muted-foreground")}
                >
                  <CalendarIcon className="h-4 w-4" />
                  {rangeLabel}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={draftRange}
                  onSelect={(r) => {
                    if (!r?.from) {
                      setDraftRange(undefined);
                      setIsSelectingCustomRange(false);
                      return;
                    }

                    if (!isSelectingCustomRange) {
                      setDraftRange({ from: r.from, to: undefined });
                      setIsSelectingCustomRange(true);
                      return;
                    }

                    const nextRange = normalizeRange(r);
                    setDraftRange(nextRange);
                    if (nextRange.from && nextRange.to) {
                      setRange(nextRange);
                      setIsSelectingCustomRange(false);
                      setCustomOpen(false);
                    }
                  }}
                  numberOfMonths={2}
                  locale={ptBR}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>



      {(hasWindsor || hasTiktok || hasRd || hasGa || hasPipedrive || hasGadsCsv || isUnorteMetaCsv) && (() => {
        const data = q.data ?? [];
        const scGroup = data.find((g) => g.connector === "searchconsole");
        const standaloneWindsorGroups = data.filter((g) => g.connector !== "searchconsole");
        const tiktokGroups = tiktokQ.data ?? [];

        type DashboardGroup = {
          connector: string;
          account_id: string;
          account_name: string | null;
          metrics: Record<string, number | null>;
          previous: Record<string, number | null>;
          derived?: Record<string, number | null>;
          derivedPrevious?: Record<string, number | null>;
          insights?: Array<{ level: "success" | "warning" | "danger" | "info"; title: string; detail: string; metric?: string }>;
          daily: Array<Record<string, number | string | null>>;
          error?: string;
        };

        const renderGroup = (group: DashboardGroup) => (
          <div key={`${group.connector}-${group.account_id}`} className="space-y-5">
            <ConnectorDashboard
              connector={group.connector}
              connectorLabel={connectorLabel(group.connector)}
              accountName={group.account_name || group.account_id}
              metrics={group.metrics}
              previous={group.previous}
              derived={group.derived ?? {}}
              derivedPrevious={group.derivedPrevious ?? {}}
              insights={group.insights ?? []}
              daily={group.daily}
              error={group.error}
            />
            {group.connector === "instagram" && topPostsQ.data && (() => {
              const filtered = topPostsQ.data.filter((p) => String(p.account_id) === String(group.account_id));
              return filtered.length > 0 ? (
                <TopPostsSection posts={filtered} sortBy={sortBy} onSortChange={setSortBy} connector="instagram" />
              ) : null;
            })()}
            {group.connector === "tiktok_oauth" && (group as any).top_posts && (() => {
              const posts = (group as any).top_posts.map((v: any) => ({
                media_id: v.id,
                account_name: group.account_name,
                media_type: "VIDEO",
                caption: v.caption,
                permalink: v.permalink,
                thumbnail: v.media_url,
                timestamp: v.timestamp,
                likes: v.like_count,
                comments: v.comments_count,
                shares: v.shares,
                saved: 0,
                reach: v.views,
                views: v.views,
                engagement: v.engagement,
              }));
              return <TopPostsSection posts={posts} sortBy={sortBy} onSortChange={setSortBy} connector="tiktok_oauth" />;
            })()}
            {group.connector === "instagram" && audienceQ.data && (() => {
              const filtered = audienceQ.data.filter((a) => String(a.account_id) === String(group.account_id));
              return filtered.length > 0 ? <AudienceSection audiences={filtered} /> : null;
            })()}
            {group.connector === "facebook_ads" && metaCreativesQ.data && metaCreativesQ.data.length > 0 && (
              <MetaAdsCreativesSection groups={metaCreativesQ.data.filter((g) => g.account_id === group.account_id)} />
            )}
          </div>
        );

        const renderGoogle = () => (
          <div className="space-y-5">
            {hasGa && gaQ.data && <Ga4Section data={gaQ.data} />}
            {gadsUnifiedConn && (
              <GoogleAdsPanel 
                reportId={reportId} 
                dateFrom={rangeArgs.dateFrom} 
                dateTo={rangeArgs.dateTo} 
              />
            )}
            {gscUnifiedConn && (
              <GoogleSearchConsolePanel 
                reportId={reportId} 
                dateFrom={rangeArgs.dateFrom} 
                dateTo={rangeArgs.dateTo} 
              />
            )}
            {scGroup && renderGroup(scGroup)}
            {scGroup && searchConsoleQ.data && searchConsoleQ.data.length > 0 && (
              <SearchConsoleSection
                groups={searchConsoleQ.data}
                yoy={searchConsoleYoYQ.data ?? []}
                monthly={searchConsoleMonthlyQ.data ?? []}
              />
            )}
            {emvQ.data && <EarnedMediaValueSection data={emvQ.data} />}
          </div>
        );

        type TabItem =
          | { kind: "windsor"; key: string; label: string; group: typeof data[number] }
          | { kind: "tiktok"; key: string; label: string; group: typeof tiktokGroups[number] }
          | { kind: "rd"; key: string; label: string }
          | { kind: "google"; key: string; label: string }
          | { kind: "crm"; key: string; label: string }
          | { kind: "gads-csv"; key: string; label: string }
          | { kind: "meta-csv-unorte"; key: string; label: string }
          | { kind: "gads-csv-unorte"; key: string; label: string }
          | { kind: "crm-csv-unorte"; key: string; label: string }
          | { kind: "analise-geral-unorte"; key: string; label: string };

        const hasGoogleTab = hasGa || !!scGroup || !!emvQ.data || !!gscUnifiedConn || !!gadsUnifiedConn;

        const items: TabItem[] = [
          ...(reportId === "1231f578-3057-4167-a705-5c45b526bf53"
            ? [{ kind: "analise-geral-unorte" as const, key: "analise-geral-unorte", label: "Análise Geral" }]
            : []),
          ...standaloneWindsorGroups.map<TabItem>((g) => ({
            kind: "windsor",
            key: `${g.connector}-${g.account_id}`,
            label: `${connectorLabel(g.connector)}${g.account_name ? ` · ${g.account_name}` : ""}`,
            group: g,
          })),
          ...tiktokGroups.map<TabItem>((g) => ({
            kind: "tiktok",
            key: `tiktok-oauth-${g.account_id}`,
            label: `${connectorLabel(g.connector)}${g.account_name ? ` · ${g.account_name}` : ""}`,
            group: g,
          })),
          ...(hasGoogleTab
            ? [{ kind: "google" as const, key: "google-suite", label: "Google Ecosystem (GA4, GSC, Ads)" }]
            : []),
          ...((gadsCsvQ.data ?? []).length > 0
            ? [{ kind: "gads-csv" as const, key: "gads-csv", label: "Google Ads (CSV)" }]
            : []),
          ...(reportId === "1231f578-3057-4167-a705-5c45b526bf53"
            ? [{ kind: "meta-csv-unorte" as const, key: "meta-csv-unorte", label: "Meta Ads (CSV)" }]
            : []),
          ...(reportId === "1231f578-3057-4167-a705-5c45b526bf53"
            ? [{ kind: "gads-csv-unorte" as const, key: "gads-csv-unorte", label: "Google Ads (CSV)" }]
            : []),
          ...(reportId === "1231f578-3057-4167-a705-5c45b526bf53"
            ? [{ kind: "crm-csv-unorte" as const, key: "crm-csv-unorte", label: "CRM (CSV)" }]
            : []),
          ...(hasRd && rdQ.data && rdQ.data.connected
            ? [{
                kind: "rd" as const,
                key: "rd-station",
                label: `RD Station${rdQ.data.accountName ? ` · ${rdQ.data.accountName}` : ""}`,
              }]
            : []),
          ...(hasPipedrive
            ? [{ kind: "crm" as const, key: "crm-pipedrive", label: "CRM · Pipedrive" }]
            : []),
        ];

        const renderItem = (it: TabItem) => {
          if (it.kind === "windsor") return renderGroup(it.group);
          if (it.kind === "tiktok") return renderGroup(it.group);
          if (it.kind === "google") return renderGoogle();
          if (it.kind === "crm") return <PipedriveCrmPanel reportId={reportId} />;
          if (it.kind === "gads-csv") return <GoogleAdsCsvPanel reportId={reportId} />;
          if (it.kind === "meta-csv-unorte") return <UnorteMetaCsvPanel />;
          if (it.kind === "gads-csv-unorte") return <UnorteGoogleAdsCsvPanel />;
          if (it.kind === "crm-csv-unorte") return <UnorteCrmCsvPanel />;
          if (it.kind === "analise-geral-unorte") return <UnorteAnaliseGeralPanel />;
          return <RDStationSection data={rdQ.data as Extract<typeof rdQ.data, { connected: true }>} />;
        };


        if (items.length <= 1 && items[0]?.kind !== "tiktok") return items.map((it) => <div key={it.key}>{renderItem(it)}</div>);

        return (
          <Tabs defaultValue={items[0].key} className="space-y-4">
            <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-muted/40 p-1">
              {items.map((it) => (
                <TabsTrigger key={it.key} value={it.key} className="text-xs">
                  {it.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {items.map((it) => (
              <TabsContent key={it.key} value={it.key} className="mt-0">
                {renderItem(it)}
              </TabsContent>
            ))}
          </Tabs>
        );
      })()}



    </div>
  );
}

function TopPostsSection({
  posts,
  sortBy,
  onSortChange,
  connector = "instagram",
}: {
  posts: Array<{
    media_id: string;
    account_name: string | null;
    media_type: string | null;
    caption: string | null;
    permalink: string | null;
    thumbnail: string | null;
    timestamp: string | null;
    likes: number;
    comments: number;
    shares: number;
    saved: number;
    reach: number;
    views: number;
    engagement: number;
  }>;
  sortBy: "engagement" | "reach" | "likes" | "views";
  onSortChange: (v: "engagement" | "reach" | "likes" | "views") => void;
  connector?: string;
}) {
  const isTiktok = connector === "tiktok_oauth";
  const platformLabel = isTiktok ? "TikTok" : "Instagram";
  
  return (
    <section className="space-y-4 rounded-2xl border border-border/40 bg-background/40 p-4 md:p-5">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="rounded-xl bg-primary/10 p-2 text-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold leading-tight">Publicações com melhor desempenho</h3>
            <p className="text-[11px] text-muted-foreground">
              {platformLabel} · ranqueado por {
                sortBy === "engagement" ? "engajamento" : 
                sortBy === "reach" ? (isTiktok ? "visualizações" : "alcance") : 
                sortBy === "likes" ? "curtidas" : 
                "visualizações"
              }
            </p>
          </div>
        </div>
        <Select value={sortBy} onValueChange={(v) => onSortChange(v as typeof sortBy)}>
          <SelectTrigger className="h-8 w-[170px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="engagement">Engajamento</SelectItem>
            <SelectItem value="likes">Curtidas</SelectItem>
            {isTiktok ? (
              <SelectItem value="views">Visualizações</SelectItem>
            ) : (
              <>
                <SelectItem value="reach">Alcance</SelectItem>
                <SelectItem value="views">Visualizações</SelectItem>
              </>
            )}
          </SelectContent>
        </Select>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((p, i) => (
          <article
            key={p.media_id || i}
            className="group relative overflow-hidden rounded-2xl border border-border/40 bg-background/60 transition-shadow hover:shadow-lg"
          >
            <div className="relative aspect-square w-full overflow-hidden bg-muted">
              {p.thumbnail ? (
                <img
                  src={p.thumbnail}
                  alt={p.caption?.slice(0, 80) ?? "post"}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  {isTiktok ? <Music2 className="h-8 w-8" /> : <Instagram className="h-8 w-8" />}
                </div>
              )}
              <div className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-bold text-white">
                #{i + 1}
              </div>
              {p.media_type && (
                <div className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">
                  {p.media_type}
                </div>
              )}
            </div>
            <div className="space-y-2 p-3">
              {p.caption && (
                <p className="line-clamp-2 text-xs text-foreground/90">{p.caption}</p>
              )}
              <div className="grid grid-cols-3 gap-1 text-[11px]">
                <PostStat icon={<Heart className="h-3 w-3" />} value={p.likes} />
                <PostStat icon={<MessageCircle className="h-3 w-3" />} value={p.comments} />
                <PostStat icon={<Share2 className="h-3 w-3" />} value={p.shares} />
                <PostStat icon={<Bookmark className="h-3 w-3" />} value={p.saved} />
                <PostStat icon={<Eye className="h-3 w-3" />} value={p.reach} label="alc." />
                <PostStat icon={<Sparkles className="h-3 w-3" />} value={p.engagement} label="eng." />
              </div>
              {p.permalink && (
                <a
                  href={p.permalink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                >
                  {isTiktok ? "Ver no TikTok" : "Ver no Instagram"} <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function PostStat({ icon, value, label }: { icon: React.ReactNode; value: number; label?: string }) {
  return (
    <div className="flex items-center gap-1 text-muted-foreground">
      {icon}
      <span className="font-semibold tabular-nums text-foreground">{formatCompact(value)}</span>
      {label && <span className="text-[10px]">{label}</span>}
    </div>
  );
}


function ConnectorDashboard({
  connector,
  connectorLabel,
  accountName,
  metrics,
  previous,
  derived,
  derivedPrevious,
  insights,
  daily,
  error,
}: {
  connector: string;
  connectorLabel: string;
  accountName: string;
  metrics: Record<string, number | null>;
  previous: Record<string, number | null>;
  derived: Record<string, number | null>;
  derivedPrevious: Record<string, number | null>;
  insights: Array<{ level: "success" | "warning" | "danger" | "info"; title: string; detail: string; metric?: string }>;
  daily: Array<Record<string, number | string | null>>;
  error?: string;
}) {
  const primaryFields = useMemo(() => {
    const preferred = PRIMARY_FIELDS[connector] ?? [];
    const available = preferred.filter((f) => metrics[f] != null);
    const visibleCount = connector === "facebook_ads" ? 6 : 4;
    if (available.length >= visibleCount) return available.slice(0, visibleCount);
    const extras = Object.keys(metrics).filter((k) => metrics[k] != null && !available.includes(k));
    return [...available, ...extras].slice(0, visibleCount);
  }, [connector, metrics]);

  const derivedFields = useMemo(() => {
    const preferred = DERIVED_FIELDS[connector] ?? [];
    return preferred.filter((f) => derived[f] != null);
  }, [connector, derived]);

  const chartData = useMemo(
    () =>
      daily.map((d) => ({
        ...d,
        _label: typeof d.date === "string" ? formatDate(d.date) : "",
      })),
    [daily],
  );

  const trendField = primaryFields.find((f) => !SNAPSHOT_FIELDS.has(f)) ?? primaryFields[0];
  const secondaryField = primaryFields.find((f) => f !== trendField && !SNAPSHOT_FIELDS.has(f));

  // Video retention funnel data (Ads / TikTok)
  const retentionData = useMemo(() => {
    const p0 = metrics.video_views ?? null;
    const p25 = metrics.video_p25_watched ?? metrics.video_views_p25 ?? null;
    const p50 = metrics.video_p50_watched ?? metrics.video_views_p50 ?? null;
    const p75 = metrics.video_p75_watched ?? metrics.video_views_p75 ?? null;
    const p100 = metrics.video_p100_watched ?? metrics.video_views_p100 ?? null;
    if (!p0 || (!p25 && !p50 && !p75 && !p100)) return [];
    return [
      { step: "0%", value: p0 },
      { step: "25%", value: p25 ?? 0 },
      { step: "50%", value: p50 ?? 0 },
      { step: "75%", value: p75 ?? 0 },
      { step: "100%", value: p100 ?? 0 },
    ];
  }, [metrics]);

  return (
    <section className="space-y-4 rounded-2xl border border-border/40 bg-background/40 p-4 md:p-5">
      <header className="flex flex-wrap items-center gap-2">
        <Badge className="bg-primary/10 text-primary hover:bg-primary/15">{connectorLabel}</Badge>
        <span className="text-sm font-semibold">{accountName}</span>
      </header>

      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : (
        <>
          {insights.length > 0 && <InsightsBar insights={insights} />}

          {/* KPI grid */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {primaryFields.map((f) => (
              <KpiCard
                key={f}
                label={METRIC_LABELS[f] ?? f}
                value={metrics[f]}
                previous={previous[f]}
                field={f}
                sparkline={chartData}
              />
            ))}
          </div>

          {/* Derived KPIs */}
          {derivedFields.length > 0 && (
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Métricas derivadas</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {derivedFields.map((f) => (
                  <KpiCard
                    key={f}
                    label={METRIC_LABELS[f] ?? f}
                    value={derived[f]}
                    previous={derivedPrevious[f]}
                    field={f}
                    sparkline={[]}
                  />
                ))}
              </div>
            </div>
          )}

          {retentionData.length > 0 && (
            <ChartCard title="Retenção de vídeo (funil)">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={retentionData} margin={{ left: -12, right: 8, top: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.08} />
                  <XAxis dataKey="step" tick={{ fontSize: 10 }} stroke="currentColor" strokeOpacity={0.4} />
                  <YAxis tick={{ fontSize: 10 }} stroke="currentColor" strokeOpacity={0.4} tickFormatter={(v) => formatCompact(Number(v))} width={44} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
                    formatter={(v: number) => formatCompact(v)}
                  />
                  <Bar dataKey="value" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {/* Charts */}
          {chartData.length > 1 && trendField && (
            <div className="grid gap-4 lg:grid-cols-2">
              <ChartCard title={`${METRIC_LABELS[trendField] ?? trendField} · Evolução`}>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={chartData} margin={{ left: -12, right: 8, top: 8, bottom: 0 }}>
                    <defs>
                      <linearGradient id={`grad-${connector}-${trendField}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary, 340 70% 40%))" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="hsl(var(--primary, 340 70% 40%))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.08} />
                    <XAxis dataKey="_label" tick={{ fontSize: 10 }} stroke="currentColor" strokeOpacity={0.4} />
                    <YAxis tick={{ fontSize: 10 }} stroke="currentColor" strokeOpacity={0.4} tickFormatter={(v) => formatCompact(Number(v))} width={44} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                      formatter={(v: number) => formatValue(trendField, v)}
                    />
                    <Area
                      type="monotone"
                      dataKey={trendField}
                      stroke="var(--primary)"
                      strokeWidth={2}
                      fill={`url(#grad-${connector}-${trendField})`}
                      name={METRIC_LABELS[trendField] ?? trendField}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>

              {secondaryField && (
                <ChartCard title={`${METRIC_LABELS[secondaryField] ?? secondaryField} · Por dia`}>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={chartData} margin={{ left: -12, right: 8, top: 8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.08} />
                      <XAxis dataKey="_label" tick={{ fontSize: 10 }} stroke="currentColor" strokeOpacity={0.4} />
                      <YAxis tick={{ fontSize: 10 }} stroke="currentColor" strokeOpacity={0.4} tickFormatter={(v) => formatCompact(Number(v))} width={44} />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 12,
                          fontSize: 12,
                        }}
                        formatter={(v: number) => formatValue(secondaryField, v)}
                      />
                      <Bar dataKey={secondaryField} fill="var(--primary)" radius={[6, 6, 0, 0]} name={METRIC_LABELS[secondaryField] ?? secondaryField} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              )}
            </div>
          )}

          {/* Multi-metric comparison */}
          {chartData.length > 1 && primaryFields.length >= 2 && (
            <ChartCard title="Comparativo de métricas">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData} margin={{ left: -12, right: 8, top: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.08} />
                  <XAxis dataKey="_label" tick={{ fontSize: 10 }} stroke="currentColor" strokeOpacity={0.4} />
                  <YAxis tick={{ fontSize: 10 }} stroke="currentColor" strokeOpacity={0.4} tickFormatter={(v) => formatCompact(Number(v))} width={44} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {primaryFields
                    .filter((f) => !SNAPSHOT_FIELDS.has(f))
                    .map((f, i) => (
                      <Line
                        key={f}
                        type="monotone"
                        dataKey={f}
                        stroke={LINE_COLORS[i % LINE_COLORS.length]}
                        strokeWidth={2}
                        dot={false}
                        name={METRIC_LABELS[f] ?? f}
                      />
                    ))}
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          )}
        </>
      )}
    </section>
  );
}

const LINE_COLORS = ["#3DFC03", "#FFFFFF", "#A5A5A5", "#6F6F6F"];

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[22px] border border-border bg-card p-8">
      <h3 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-widest">{title}</h3>
      {children}
    </div>
  );
}

function KpiCard({
  label,
  value,
  previous,
  field,
  sparkline,
}: {
  label: string;
  value: number | null;
  previous: number | null | undefined;
  field: string;
  sparkline: Array<Record<string, number | string | null>>;
}) {
  const d = delta(value, previous ?? null);
  const hasSpark = sparkline.length > 1 && sparkline.some((r) => typeof r[field] === "number");
  return (
    <div className="group relative overflow-hidden rounded-[22px] bg-primary p-8 transition-shadow hover:shadow-lg">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[13px] uppercase tracking-wider text-black font-semibold">{label}</p>
          <p className="mt-2 text-[52px] font-bold tabular-nums text-black leading-none">{formatValue(field, value)}</p>
        </div>
        <DeltaBadge value={d} />
      </div>
      {/* Sparkline adjusted for light context if needed, but keeping primary-styled one for now */}
      {hasSpark && (
        <div className="mt-2 h-10">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkline} margin={{ left: 0, right: 0, top: 2, bottom: 0 }}>
              <defs>
                <linearGradient id={`spark-${field}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey={field} stroke="var(--primary)" strokeWidth={1.5} fill={`url(#spark-${field})`} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function InsightsBar({
  insights,
}: {
  insights: Array<{ level: "success" | "warning" | "danger" | "info"; title: string; detail: string }>;
}) {
  const styles: Record<string, string> = {
    success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    warning: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    danger: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
    info: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  };
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {insights.map((i, idx) => (
        <div
          key={idx}
          className={cn("rounded-xl border p-2.5 text-xs", styles[i.level])}
        >
          <p className="font-semibold leading-tight">{i.title}</p>
          <p className="mt-0.5 text-[11px] opacity-80">{i.detail}</p>
        </div>
      ))}
    </div>
  );
}

function AudienceSection({
  audiences,
}: {
  audiences: Array<{
    account_id: string;
    account_name: string | null;
    gender: Array<{ label: string; value: number }>;
    age: Array<{ label: string; value: number }>;
    gender_age: Array<{ label: string; value: number }>;
    city: Array<{ label: string; value: number }>;
    country: Array<{ label: string; value: number }>;
  }>;
}) {
  const genderLabel = (g: string) => {
    const k = g.toUpperCase();
    if (k === "F") return "Feminino";
    if (k === "M") return "Masculino";
    if (k === "U") return "Não informado";
    return g;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold">Insights de audiência</h3>
        <span className="text-[11px] text-muted-foreground">Instagram · quem segue o perfil</span>
      </div>
      {audiences.map((a) => {
        const totalGender = a.gender.reduce((s, x) => s + x.value, 0) || 1;
        const hasAny =
          a.gender.length + a.age.length + a.city.length + a.country.length + a.gender_age.length > 0;
        if (!hasAny) {
          return (
            <div
              key={a.account_id}
              className="glass rounded-2xl p-4 text-xs text-muted-foreground"
            >
              Sem dados demográficos disponíveis para {a.account_name ?? a.account_id}.
            </div>
          );
        }
        return (
          <div key={a.account_id} className="glass space-y-4 rounded-2xl p-4">
            <div className="text-xs font-medium text-muted-foreground">
              {a.account_name ?? a.account_id}
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {a.gender.length > 0 && (
                <div className="rounded-xl border border-border/50 p-3">
                  <div className="mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                    Gênero
                  </div>
                  <div className="space-y-2">
                    {a.gender.map((g) => {
                      const pct = (g.value / totalGender) * 100;
                      return (
                        <div key={g.label}>
                          <div className="flex justify-between text-xs">
                            <span>{genderLabel(g.label)}</span>
                            <span className="font-medium">{pct.toFixed(1)}%</span>
                          </div>
                          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full bg-primary"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {a.age.length > 0 && (
                <BreakdownList title="Faixa etária" items={a.age} />
              )}
              {a.country.length > 0 && (
                <BreakdownList title="Países" items={a.country.slice(0, 6)} />
              )}
              {a.city.length > 0 && (
                <BreakdownList title="Cidades" items={a.city.slice(0, 6)} />
              )}
              {a.gender_age.length > 0 && a.age.length === 0 && (
                <BreakdownList title="Gênero × Idade" items={a.gender_age.slice(0, 8)} />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BreakdownList({
  title,
  items,
}: {
  title: string;
  items: Array<{ label: string; value: number }>;
}) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="rounded-xl border border-border/50 p-3">
      <div className="mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
      <div className="space-y-1.5">
        {items.map((i) => (
          <div key={i.label}>
            <div className="flex justify-between text-xs">
              <span className="truncate pr-2">{i.label}</span>
              <span className="font-medium tabular-nums">
                {i.value.toLocaleString("pt-BR")}
              </span>
            </div>
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary/70"
                style={{ width: `${(i.value / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SearchConsoleSection({
  groups,
  yoy,
  monthly,
}: {
  groups: Array<{
    account_id: string;
    account_name: string | null;
    pages: Array<{ key: string; clicks: number; impressions: number; ctr: number; position: number }>;
    queries: Array<{ key: string; clicks: number; impressions: number; ctr: number; position: number }>;
  }>;
  yoy: Array<{
    account_id: string;
    account_name: string | null;
    current: { clicks: number; impressions: number; ctr: number; position: number };
    previous: { clicks: number; impressions: number; ctr: number; position: number };
    rangeCurrent: { from: string; to: string };
    rangePrevious: { from: string; to: string };
  }>;
  monthly: Array<{
    account_id: string;
    account_name: string | null;
    year: number;
    months: Array<{ month: number; label: string; clicks: number; impressions: number }>;
  }>;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold">Top páginas & buscas</h3>
        <span className="text-[11px] text-muted-foreground">Google Search Console · ranqueado por impressões</span>
      </div>
      {groups.map((g) => {
        const y = yoy.find((it) => it.account_id === g.account_id);
        const m = monthly.find((it) => it.account_id === g.account_id);
        return (
          <div key={g.account_id} className="glass space-y-4 rounded-2xl p-4">
            <div className="text-xs font-medium text-muted-foreground">
              {g.account_name ?? g.account_id}
            </div>
            {y && <SearchConsoleYoYTiles yoy={y} />}
            {m && m.months.length > 0 && <SearchConsoleMonthlyChart data={m} />}
            <div className="grid gap-4 lg:grid-cols-2">
              {g.pages.length > 0 && <SearchConsoleTable title="Principais páginas" rows={g.pages} labelHeader="Página" isUrl />}
              {g.queries.length > 0 && <SearchConsoleTable title="Principais buscas" rows={g.queries} labelHeader="Consulta" isUrl={false} />}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SearchConsoleMonthlyChart({
  data,
}: {
  data: {
    year: number;
    months: Array<{ month: number; label: string; clicks: number; impressions: number }>;
  };
}) {
  const tooltipStyle = {
    background: "var(--popover)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    fontSize: 12,
    color: "var(--popover-foreground)",
  } as const;
  const renderChart = (
    dataKey: "impressions" | "clicks",
    name: string,
    fill: string,
  ) => (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data.months} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
        <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickFormatter={(v: number) => formatCompact(v)} />
        <Tooltip
          formatter={(v: number) => [formatCompact(v), name]}
          contentStyle={tooltipStyle}
          cursor={{ fill: "var(--accent)", opacity: 0.3 }}
        />
        <Bar dataKey={dataKey} name={name} fill={fill} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <div className="rounded-xl border border-border/50 p-3">
        <div className="mb-2 flex flex-wrap items-baseline gap-x-2 text-[11px] uppercase tracking-wide text-muted-foreground">
          <span>Impressões por mês</span>
          <span className="normal-case tracking-normal text-muted-foreground/80">
            {data.year} · até o mês selecionado
          </span>
        </div>
        {renderChart("impressions", "Impressões", "var(--primary)")}
      </div>
      <div className="rounded-xl border border-border/50 p-3">
        <div className="mb-2 flex flex-wrap items-baseline gap-x-2 text-[11px] uppercase tracking-wide text-muted-foreground">
          <span>Cliques por mês</span>
          <span className="normal-case tracking-normal text-muted-foreground/80">
            {data.year} · até o mês selecionado
          </span>
        </div>
        {renderChart("clicks", "Cliques", "var(--secondary)")}
      </div>
    </div>
  );
}


function SearchConsoleYoYTiles({
  yoy,
}: {
  yoy: {
    current: { clicks: number; impressions: number; ctr: number; position: number };
    previous: { clicks: number; impressions: number; ctr: number; position: number };
    rangeCurrent: { from: string; to: string };
    rangePrevious: { from: string; to: string };
  };
}) {
  const items: Array<{
    label: string;
    cur: number;
    prev: number;
    fmt: (n: number) => string;
    invert?: boolean;
  }> = [
    { label: "Impressões", cur: yoy.current.impressions, prev: yoy.previous.impressions, fmt: (n) => formatCompact(n) },
    { label: "Cliques", cur: yoy.current.clicks, prev: yoy.previous.clicks, fmt: (n) => formatCompact(n) },
    { label: "CTR", cur: yoy.current.ctr * 100, prev: yoy.previous.ctr * 100, fmt: (n) => `${n.toFixed(2)}%` },
    { label: "Posição", cur: yoy.current.position, prev: yoy.previous.position, fmt: (n) => n.toFixed(1), invert: true },
  ];
  return (
    <div className="rounded-xl border border-border/50 p-3">
      <div className="mb-2 flex flex-wrap items-baseline gap-x-2 text-[11px] uppercase tracking-wide text-muted-foreground">
        <span>Comparativo YoY</span>
        <span className="normal-case tracking-normal text-muted-foreground/80">
          {yoy.rangeCurrent.from} → {yoy.rangeCurrent.to} vs {yoy.rangePrevious.from} → {yoy.rangePrevious.to}
        </span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((it) => {
          const change = it.prev > 0 ? ((it.cur - it.prev) / it.prev) * 100 : null;
          const positive = change == null ? false : it.invert ? change < 0 : change > 0;
          const negative = change == null ? false : it.invert ? change > 0 : change < 0;
          return (
            <div key={it.label} className="rounded-lg border border-border/40 bg-background/40 p-3">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{it.label}</div>
              <div className="mt-1 text-lg font-semibold tabular-nums">{it.fmt(it.cur)}</div>
              <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                <span>ano anterior: {it.fmt(it.prev)}</span>
                {change != null && (
                  <span
                    className={
                      positive
                        ? "text-emerald-500"
                        : negative
                        ? "text-red-500"
                        : "text-muted-foreground"
                    }
                  >
                    {change >= 0 ? "+" : ""}
                    {change.toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SearchConsoleTable({
  title,
  rows,
  labelHeader,
  isUrl,
}: {
  title: string;
  rows: Array<{ key: string; clicks: number; impressions: number; ctr: number; position: number }>;
  labelHeader: string;
  isUrl: boolean;
}) {
  const shortenUrl = (u: string) => {
    try {
      const url = new URL(u);
      const path = url.pathname === "/" ? "/" : url.pathname.replace(/\/$/, "");
      return path;
    } catch {
      return u;
    }
  };
  return (
    <div className="rounded-xl border border-border/50 p-3">
      <div className="mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">{title}</div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[10px] uppercase text-muted-foreground">
              <th className="pb-2 text-left font-medium">{labelHeader}</th>
              <th className="pb-2 text-right font-medium">Impr.</th>
              <th className="pb-2 text-right font-medium">Cliques</th>
              <th className="pb-2 text-right font-medium">CTR</th>
              <th className="pb-2 text-right font-medium">Posição</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-t border-border/40">
                <td className="max-w-[220px] truncate py-1.5 pr-2" title={r.key}>
                  {isUrl ? (
                    <a href={r.key} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                      {shortenUrl(r.key)}
                    </a>
                  ) : (
                    r.key
                  )}
                </td>
                <td className="py-1.5 text-right tabular-nums">{formatCompact(r.impressions)}</td>
                <td className="py-1.5 text-right tabular-nums">{formatCompact(r.clicks)}</td>
                <td className="py-1.5 text-right tabular-nums">{(r.ctr * 100).toFixed(2)}%</td>
                <td className="py-1.5 text-right tabular-nums">{r.position.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type MetaCreative = {
  ad_id: string;
  ad_name: string;
  campaign_name: string | null;
  adset_name: string | null;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  frequency: number;
  leads: number;
  cpl: number;
  status: "healthy" | "fatigue" | "low-ctr" | "expensive" | "winning";
  statusReason: string;
};

function MetaAdsCreativesSection({
  groups,
}: {
  groups: Array<{ account_id: string; account_name: string | null; creatives: MetaCreative[] }>;
}) {
  const [sortBy, setSortBy] = useState<"spend" | "ctr" | "cpc" | "frequency" | "impressions" | "leads" | "cpl">("spend");

  const badgeStyles: Record<MetaCreative["status"], string> = {
    winning: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    healthy: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30",
    fatigue: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
    "low-ctr": "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
    expensive: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30",
  };
  const statusLabel: Record<MetaCreative["status"], string> = {
    winning: "Escalar",
    healthy: "Saudável",
    fatigue: "Fadiga",
    "low-ctr": "CTR baixo",
    expensive: "Caro",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="rounded-xl bg-primary/10 p-2 text-primary">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold leading-tight">Análise de criativos · Meta Ads</h3>
          <p className="text-[11px] text-muted-foreground">Diagnóstico automático de fadiga, CTR e eficiência por anúncio</p>
        </div>
      </div>
      {groups.map((g) => {
        const creatives = [...g.creatives].sort((a, b) => {
          if (sortBy === "cpl") {
            const av = a.cpl > 0 ? a.cpl : Number.POSITIVE_INFINITY;
            const bv = b.cpl > 0 ? b.cpl : Number.POSITIVE_INFINITY;
            return av - bv;
          }
          return (b[sortBy] as number) - (a[sortBy] as number);
        });
        const fatigueCount = creatives.filter((c) => c.status === "fatigue").length;
        const lowCtrCount = creatives.filter((c) => c.status === "low-ctr").length;
        const winningCount = creatives.filter((c) => c.status === "winning").length;
        const totalSpend = creatives.reduce((s, c) => s + c.spend, 0);
        const spendOnFatigue = creatives.filter((c) => c.status === "fatigue" || c.status === "low-ctr").reduce((s, c) => s + c.spend, 0);
        const wastedPct = totalSpend > 0 ? (spendOnFatigue / totalSpend) * 100 : 0;

        return (
          <div key={g.account_id} className="glass space-y-4 rounded-2xl p-4">
            <div className="grid gap-2 sm:grid-cols-4">
              <SummaryTile label="Criativos analisados" value={String(creatives.length)} />
              <SummaryTile label="Vencedores" value={String(winningCount)} tone="success" />
              <SummaryTile label="Em fadiga" value={String(fatigueCount)} tone={fatigueCount > 0 ? "danger" : "muted"} />
              <SummaryTile label="Investimento comprometido" value={`${wastedPct.toFixed(0)}%`} tone={wastedPct > 30 ? "danger" : wastedPct > 15 ? "warning" : "muted"} hint="em criativos fracos/fatigados" />
            </div>

            {(fatigueCount > 0 || lowCtrCount > 0 || winningCount > 0) && (
              <div className="grid gap-2 sm:grid-cols-2">
                {winningCount > 0 && (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-800 dark:text-emerald-200">
                    <p className="font-semibold">📈 {winningCount} criativo(s) performando acima do padrão</p>
                    <p className="mt-0.5 opacity-80">Escale o budget e replique o formato/mensagem nos demais anúncios.</p>
                  </div>
                )}
                {fatigueCount > 0 && (
                  <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-800 dark:text-rose-200">
                    <p className="font-semibold">🔄 {fatigueCount} criativo(s) em fadiga (freq ≥ 3.5)</p>
                    <p className="mt-0.5 opacity-80">Renovar criativos ou expandir audiência para reduzir sobreposição.</p>
                  </div>
                )}
                {lowCtrCount > 0 && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200">
                    <p className="font-semibold">⚠️ {lowCtrCount} criativo(s) com CTR fraco</p>
                    <p className="mt-0.5 opacity-80">Revisar gancho, thumbnail e proposta de valor. Testar novas variações.</p>
                  </div>
                )}
              </div>
            )}

            {creatives.length > 0 && (
              <ChartCard title="Investimento por criativo (top 10)">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={creatives.slice(0, 10).map((c) => ({ name: c.ad_name.slice(0, 24), spend: c.spend, ctr: c.ctr }))} margin={{ left: -12, right: 8, top: 8, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.08} />
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="currentColor" strokeOpacity={0.4} angle={-25} textAnchor="end" height={50} />
                    <YAxis tick={{ fontSize: 10 }} stroke="currentColor" strokeOpacity={0.4} tickFormatter={(v) => formatCompact(Number(v))} width={50} />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
                      formatter={(v: number, k: string) => (k === "spend" ? [formatValue("spend", v), "Investimento"] : [`${v.toFixed(2)}%`, "CTR"])}
                    />
                    <Bar dataKey="spend" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

            <div className="rounded-xl border border-border/50">
              <div className="flex items-center justify-between border-b border-border/40 p-3">
                <div className="text-xs font-semibold">Ranking de criativos</div>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                  <SelectTrigger className="h-8 w-[160px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="spend">Investimento</SelectItem>
                    <SelectItem value="leads">Leads gerados</SelectItem>
                    <SelectItem value="cpl">CPL (menor)</SelectItem>
                    <SelectItem value="ctr">CTR</SelectItem>
                    <SelectItem value="cpc">CPC</SelectItem>
                    <SelectItem value="frequency">Frequência</SelectItem>
                    <SelectItem value="impressions">Impressões</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[10px] uppercase text-muted-foreground">
                      <th className="p-2 text-left font-medium">Anúncio</th>
                      <th className="p-2 text-left font-medium">Status</th>
                      <th className="p-2 text-right font-medium">Invest.</th>
                      <th className="p-2 text-right font-medium">Impr.</th>
                      <th className="p-2 text-right font-medium">CTR</th>
                      <th className="p-2 text-right font-medium">CPC</th>
                      <th className="p-2 text-right font-medium">CPM</th>
                      <th className="p-2 text-right font-medium">Leads</th>
                      <th className="p-2 text-right font-medium">CPL</th>
                      <th className="p-2 text-right font-medium">Freq.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {creatives.map((c) => (
                      <tr key={c.ad_id} className="border-t border-border/40 align-top">
                        <td className="max-w-[240px] p-2">
                          <div className="truncate font-medium" title={c.ad_name}>{c.ad_name}</div>
                          {c.campaign_name && (
                            <div className="truncate text-[10px] text-muted-foreground" title={c.campaign_name}>
                              {c.campaign_name}
                            </div>
                          )}
                          <div className="mt-0.5 text-[10px] text-muted-foreground opacity-80">{c.statusReason}</div>
                        </td>
                        <td className="p-2">
                          <span className={cn("inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-semibold", badgeStyles[c.status])}>
                            {statusLabel[c.status]}
                          </span>
                        </td>
                        <td className="p-2 text-right tabular-nums">{formatValue("spend", c.spend)}</td>
                        <td className="p-2 text-right tabular-nums">{formatCompact(c.impressions)}</td>
                        <td className={cn("p-2 text-right tabular-nums", c.ctr > 0 && c.ctr < 1 && "text-amber-600 dark:text-amber-400")}>{c.ctr.toFixed(2)}%</td>
                        <td className="p-2 text-right tabular-nums">{formatValue("cpc", c.cpc)}</td>
                        <td className="p-2 text-right tabular-nums">{formatValue("cpm", c.cpm)}</td>
                        <td className="p-2 text-right tabular-nums">{formatCompact(c.leads)}</td>
                        <td className="p-2 text-right tabular-nums">{c.cpl > 0 ? formatValue("cpc", c.cpl) : "—"}</td>
                        <td className={cn("p-2 text-right tabular-nums", c.frequency >= 3.5 && "text-rose-600 dark:text-rose-400 font-semibold")}>{c.frequency.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SummaryTile({ label, value, hint, tone = "muted" }: { label: string; value: string; hint?: string; tone?: "muted" | "success" | "warning" | "danger" }) {
  const toneCls = {
    muted: "text-foreground",
    success: "text-emerald-600 dark:text-emerald-400",
    warning: "text-amber-600 dark:text-amber-400",
    danger: "text-rose-600 dark:text-rose-400",
  }[tone];
  return (
    <div className="rounded-xl border border-border/50 bg-background/60 p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-2xl font-bold tabular-nums", toneCls)}>{value}</p>
      {hint && <p className="mt-0.5 text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

type GaData = {
  range?: { startDate: string; endDate: string };
  properties: Array<{
    id: string;
    propertyId: string | null;
    label: string | null;
    error?: string;
    totals: Record<string, number>;
    timeseries: Array<{ date: string; activeUsers: number; sessions: number }>;
    channels: Array<{ channel: string; sessions: number; activeUsers: number }>;
    topPages: Array<{ page: string; views: number; activeUsers: number }>;
    aiSources?: Array<{ source: string; sessions: number; activeUsers: number }>;
    aiLanding?: Array<{ page: string; source: string; sessions: number; activeUsers: number }>;
    aiMonthly?: Array<{ month: number; label: string; sessions: number }>;
    usersMonthly?: Array<{ month: number; label: string; activeUsers: number; newUsers: number }>;
    aiYear?: number;

  }>;
};


function formatDurationSec(sec: number): string {
  if (!sec) return "0s";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return m ? `${m}m ${s}s` : `${s}s`;
}

function Ga4Section({ data }: { data: GaData }) {
  const [tab, setTab] = useState(data.properties[0]?.id ?? "");
  const props = data.properties;
  if (!props.length) return null;

  const renderProperty = (p: GaData["properties"][number]) => {
    if (p.error) {
      return (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-4 text-xs text-rose-600 dark:text-rose-400">
          {p.error}
        </div>
      );
    }
    const t = p.totals;
    const chartData = p.timeseries.map((r) => ({
      date: r.date.length === 8 ? `${r.date.slice(6, 8)}/${r.date.slice(4, 6)}` : r.date,
      Usuários: r.activeUsers,
      Sessões: r.sessions,
    }));
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <SummaryTile label="Usuários ativos" value={formatCompact(t.activeUsers ?? 0)} />
          <SummaryTile label="Novos usuários" value={formatCompact(t.newUsers ?? 0)} />
          <SummaryTile label="Sessões" value={formatCompact(t.sessions ?? 0)} />
          <SummaryTile label="Pageviews" value={formatCompact(t.screenPageViews ?? 0)} />
          <SummaryTile
            label="Engagement rate"
            value={`${((t.engagementRate ?? 0) * 100).toFixed(1)}%`}
          />
          <SummaryTile
            label="Bounce rate"
            value={`${((t.bounceRate ?? 0) * 100).toFixed(1)}%`}
          />
          <SummaryTile label="Duração média" value={formatDurationSec(t.averageSessionDuration ?? 0)} />
          <SummaryTile label="Conversões" value={formatCompact(t.conversions ?? 0)} />
        </div>

        {chartData.length > 0 && (
          <div className="rounded-2xl border border-border/50 bg-background/60 p-4">
            <p className="mb-3 text-sm font-semibold">Usuários & Sessões ao longo do período</p>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="ga-users" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="ga-sessions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--secondary)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="var(--secondary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, color: "var(--popover-foreground)" }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="Usuários" stroke="var(--primary)" fill="url(#ga-users)" strokeWidth={2} />
                  <Area type="monotone" dataKey="Sessões" stroke="var(--secondary)" fill="url(#ga-sessions)" strokeWidth={2} />

                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {(p.usersMonthly?.some((m) => m.activeUsers > 0 || m.newUsers > 0) ?? false) && (
          <div className="grid gap-3 lg:grid-cols-2">
            {([
              { key: "activeUsers" as const, name: "Usuários ativos", fill: "var(--primary)" },
              { key: "newUsers" as const, name: "Novos usuários", fill: "var(--secondary)" },
            ]).map(({ key, name, fill }) => (
              <div key={key} className="rounded-xl border border-border/50 p-3">
                <div className="mb-2 flex flex-wrap items-baseline gap-x-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                  <span>{name} por mês</span>
                  <span className="normal-case tracking-normal text-muted-foreground/80">
                    {p.aiYear} · até o mês selecionado
                  </span>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={p.usersMonthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                    <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickFormatter={(v: number) => formatCompact(v)} />
                    <Tooltip
                      formatter={(v: number) => [formatCompact(v), name]}
                      contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, color: "var(--popover-foreground)" }}
                      cursor={{ fill: "var(--accent)", opacity: 0.3 }}
                    />
                    <Bar dataKey={key} name={name} fill={fill} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ))}
          </div>
        )}


        <div className="grid gap-4 lg:grid-cols-2">
          {p.channels.length > 0 && (
            <div className="rounded-2xl border border-border/50 bg-background/60 p-4">
              <p className="mb-3 text-sm font-semibold">Canais de tráfego</p>
              <div className="space-y-2">
                {p.channels.map((c) => (
                  <div key={c.channel} className="flex items-center justify-between text-xs">
                    <span className="truncate">{c.channel}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {formatCompact(c.sessions)} sessões · {formatCompact(c.activeUsers)} usuários
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {p.topPages.length > 0 && (
            <div className="rounded-2xl border border-border/50 bg-background/60 p-4">
              <p className="mb-3 text-sm font-semibold">Páginas mais vistas</p>
              <div className="space-y-2">
                {p.topPages.map((pg) => (
                  <div key={pg.page} className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate" title={pg.page}>{pg.page}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {formatCompact(pg.views)} views
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {((p.aiSources?.length ?? 0) > 0 || (p.aiLanding?.length ?? 0) > 0 || (p.aiMonthly?.some((m) => m.sessions > 0) ?? false)) && (() => {
          const sources = p.aiSources ?? [];
          const landing = p.aiLanding ?? [];
          const monthly = p.aiMonthly ?? [];
          const totalSessions = sources.reduce((s, r) => s + r.sessions, 0);
          const PIE_COLORS = [
            "var(--primary)",
            "var(--secondary)",
            "hsl(12 76% 61%)",
            "hsl(173 58% 39%)",
            "hsl(43 74% 66%)",
            "hsl(280 65% 60%)",
            "hsl(340 75% 55%)",
            "hsl(200 70% 50%)",
          ];
          const pieData = sources.slice(0, 8).map((s, i) => ({
            name: s.source,
            value: s.sessions,
            fill: PIE_COLORS[i % PIE_COLORS.length],
          }));
          const tooltipStyle = {
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 12,
            color: "var(--popover-foreground)",
          } as const;
          return (
            <div className="space-y-4 rounded-2xl border border-primary/30 bg-primary/[0.03] p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">AI Traffic</p>
                <Badge className="bg-primary/15 text-primary hover:bg-primary/20">
                  {formatCompact(totalSessions)} sessões
                </Badge>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-border/50 bg-background/60 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total de sessões IA</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-primary">{formatCompact(totalSessions)}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">no período selecionado</p>
                </div>
                <div className="rounded-xl border border-border/50 bg-background/60 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Fontes distintas</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums">{sources.length}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">plataformas de IA</p>
                </div>
                <div className="rounded-xl border border-border/50 bg-background/60 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Páginas de destino</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums">{landing.length}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">URLs acessadas via IA</p>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-border/50 bg-background/60 p-3">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Origem da sessão</p>
                  {sources.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Nenhum tráfego de IA detectado no período.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {sources.map((r) => (
                        <div key={r.source} className="flex items-center justify-between text-xs">
                          <span className="truncate">{r.source}</span>
                          <span className="tabular-nums text-muted-foreground">
                            {formatCompact(r.sessions)} sessões · {formatCompact(r.activeUsers)} usuários
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="rounded-xl border border-border/50 bg-background/60 p-3">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Distribuição por origem</p>
                  {pieData.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Sem dados para exibir.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={85}
                          paddingAngle={2}
                        >
                          {pieData.map((entry, i) => (
                            <Cell key={i} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(v: number, n: string) => [`${formatCompact(v)} sessões`, n]}
                          contentStyle={tooltipStyle}
                        />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-border/50 bg-background/60 p-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Páginas de destino do AI Traffic</p>
                {landing.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Sem páginas de destino no período.</p>
                ) : (
                  <div className="space-y-1.5">
                    {landing.map((r, i) => (
                      <div key={`${r.page}-${r.source}-${i}`} className="flex items-center justify-between gap-2 text-xs">
                        <span className="truncate" title={`${r.page} · ${r.source}`}>
                          <span>{r.page}</span>
                          <span className="ml-1 text-muted-foreground">· {r.source}</span>
                        </span>
                        <span className="shrink-0 tabular-nums text-muted-foreground">
                          {formatCompact(r.sessions)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {monthly.length > 0 && (
                <div className="rounded-xl border border-border/50 bg-background/60 p-3">
                  <div className="mb-2 flex flex-wrap items-baseline gap-x-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                    <span>Sessões de AI Traffic por mês</span>
                    <span className="normal-case tracking-normal text-muted-foreground/80">
                      {p.aiYear} · até o mês selecionado
                    </span>
                  </div>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={monthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                      <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickFormatter={(v: number) => formatCompact(v)} />
                      <Tooltip
                        formatter={(v: number) => [formatCompact(v), "Sessões"]}
                        contentStyle={tooltipStyle}
                        cursor={{ fill: "var(--accent)", opacity: 0.3 }}
                      />
                      <Bar dataKey="sessions" name="Sessões" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          );
        })()}



      </div>
    );
  };


  return (
    <div className="space-y-4 border-t border-border/40 pt-6">
      <div className="flex items-center gap-2">
        <Badge className="bg-primary/10 text-primary hover:bg-primary/15">Google Analytics 4</Badge>
        {data.range && (
          <span className="text-[11px] text-muted-foreground">
            {data.range.startDate} → {data.range.endDate}
          </span>
        )}
      </div>
      {props.length === 1 ? (
        renderProperty(props[0])
      ) : (
        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-muted/40 p-1">
            {props.map((p) => (
              <TabsTrigger key={p.id} value={p.id} className="text-xs">
                {p.label || p.propertyId || "GA4"}
              </TabsTrigger>
            ))}
          </TabsList>
          {props.map((p) => (
            <TabsContent key={p.id} value={p.id} className="mt-0">
              {renderProperty(p)}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}

type EmvData = {
  emv: number;
  currency: string;
  keywordsAnalyzed: number;
  keywordsMatched: number;
  breakdown: Array<{ keyword: string; clicks: number; cpc: number; value: number }>;
  error?: string;
  needsReauth?: boolean;
};

function EarnedMediaValueSection({ data }: { data: EmvData }) {
  const fmtMoney = (n: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: data.currency || "BRL",
      maximumFractionDigits: 0,
    }).format(n);
  const fmtCpc = (n: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: data.currency || "BRL",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  const adsPermissionError = /USER_PERMISSION_DENIED|não tem acesso à conta Google Ads/i.test(
    data.error ?? "",
  );
  const googleAdsApiError = /^Google Ads \d+:/i.test(data.error ?? "");
  const shouldReconnect = data.needsReauth && !adsPermissionError && !googleAdsApiError;

  return (
    <div className="rounded-2xl border border-border/50 bg-card/60 p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold">Earned Media Value</h3>
          <p className="text-xs text-muted-foreground">
            Quanto custaria comprar esse tráfego orgânico no Google Ads (CPC estimado × cliques do
            Search Console).
          </p>
        </div>
        {data.error ? (
          <Badge variant="destructive" className="shrink-0">
            {shouldReconnect ? "Reconectar Google" : "Erro"}
          </Badge>
        ) : (
          <Badge variant="secondary" className="shrink-0">
            {data.keywordsMatched}/{data.keywordsAnalyzed} keywords com CPC
          </Badge>
        )}
      </div>

      {data.error ? (
        <p className="text-sm text-muted-foreground">
          {shouldReconnect
            ? "Reconecte a conta Google no admin do relatório para conceder o scope de Google Ads."
            : data.error}
        </p>
      ) : (
        <>
          <div className="text-3xl font-semibold tracking-tight">{fmtMoney(data.emv)}</div>
          {data.breakdown.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/40 text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Keyword</th>
                    <th className="py-2 pr-4 font-medium text-right">Cliques</th>
                    <th className="py-2 pr-4 font-medium text-right">CPC</th>
                    <th className="py-2 font-medium text-right">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {data.breakdown.map((r) => (
                    <tr key={r.keyword} className="border-b border-border/20">
                      <td className="py-2 pr-4">{r.keyword}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{r.clicks}</td>
                      <td className="py-2 pr-4 text-right tabular-nums text-muted-foreground">
                        {r.cpc > 0 ? fmtCpc(r.cpc) : "—"}
                      </td>
                      <td className="py-2 text-right tabular-nums font-medium">
                        {fmtMoney(r.value)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ---------------- RD Station Marketing ----------------

type RdSettled = { data: unknown; error: string | null };
type RdData = {
  connected: true;
  accountName: string | null;
  range: { start_date: string; end_date: string };
  showConversions?: boolean;
  showEmails?: boolean;
  conversions: RdSettled;
  emails: RdSettled;
};


const RD_LABELS: Record<string, string> = {
  visitors: "Visitantes",
  leads: "Leads",
  qualified_leads: "Leads qualificados",
  opportunities: "Oportunidades",
  sales: "Vendas",
  customers: "Clientes",
  sent: "Enviados",
  delivered: "Entregues",
  opened: "Abertos",
  clicked: "Cliques",
  bounced: "Devolvidos",
  unsubscribed: "Descadastros",
  spam: "Spam",
  complained: "Reclamações",
  soft_bounced: "Devoluções suaves",
  hard_bounced: "Devoluções graves",
  open_rate: "Taxa de abertura",
  click_rate: "Taxa de cliques",
  account_id: "Conta",
  email_id: "E-mail",
  asset_id: "Ativo",
  asset_type: "Tipo de ativo",
  asset_identifier: "Identificador do ativo",
  campaign_id: "Campanha",
  conversion_count: "Conversões",
  visits_count: "Visitas",
  conversion_rate: "Taxa de conversão",
  email_dropped_count: "E-mails descartados",
  email_sent_count_estimate: "E-mails enviados",
  email_sent_rate_estimate: "Taxa de envio",
  email_delivered_count: "E-mails entregues",
  email_bounced_count: "E-mails devolvidos",
  email_opened_count: "E-mails abertos",
  email_clicked_count: "Cliques",
  email_unsubscribed_count: "Descadastros",
  email_spam_reported_count: "Marcados como spam",
  email_delivered_rate: "Taxa de entrega",
  email_opened_rate: "Taxa de abertura",
  email_clicked_rate: "Taxa de cliques",
  email_spam_reported_rate: "Taxa de spam",
  contacts_count: "Leads selecionados",
  leads_count: "Leads selecionados",
  engaged_leads_count: "Leads engajados",
  indeterminate_leads_count: "Leads indeterminados",
  disengaged_leads_count: "Leads desengajados",
  invalid_leads_count: "Leads inválidos",
  engaged_leads_rate: "Engajados",
  indeterminate_leads_rate: "Indeterminados",
  disengaged_leads_rate: "Desengajados",
  invalid_leads_rate: "Inválidos",
  rd_analytics_missing: "Analytics pendente",
  landing_page: "Landing page",
  form: "Formulário",
  pop_up: "Pop-up",
  event: "Evento",
  chat: "Chat",
  imported: "Importação",
  total: "Total",
  count: "Quantidade",
  value: "Valor",
  amount: "Valor",
  rate: "Taxa",
  percentage: "Percentual",
  date: "Data",
  day: "Dia",
  week: "Semana",
  month: "Mês",
};

const RD_RATE_KEYS = new Set([
  "conversion_rate",
  "email_delivered_rate",
  "email_opened_rate",
  "email_clicked_rate",
  "email_spam_reported_rate",
  "email_sent_rate_estimate",
  "open_rate",
  "click_rate",
  "rate",
  "percentage",
  "engaged_leads_rate",
  "indeterminate_leads_rate",
  "disengaged_leads_rate",
  "invalid_leads_rate",
]);

const RD_ID_KEYS = new Set(["account_id", "asset_id", "campaign_id", "asset_identifier", "email_id", "id"]);

const RD_INCOMPLETE_EMAIL_KEYS = new Set([
  "email_delivered_count",
  "email_bounced_count",
  "email_opened_count",
  "email_clicked_count",
  "email_unsubscribed_count",
  "email_spam_reported_count",
  "email_delivered_rate",
  "email_opened_rate",
  "email_clicked_rate",
  "email_spam_reported_rate",
]);

function rdLabel(key: string): string {
  const leaf = key.split(".").pop() ?? key;
  return RD_LABELS[leaf] ?? leaf.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatRdValue(key: string, v: number): string {
  const leaf = key.split(".").pop() ?? key;
  if (RD_ID_KEYS.has(leaf)) return String(v);
  if (RD_RATE_KEYS.has(leaf)) return `${v.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

function isDisabledError(err: string | null): boolean {
  return err === "disabled";
}

function isPermissionError(err: string | null): boolean {
  if (!err) return false;
  return err.startsWith("Sem permissão do RD Station") || /FORBIDDEN/i.test(err) || /\b401\b|\b403\b/.test(err);
}


type RdRecord = Record<string, unknown>;

function extractRdRecords(data: unknown): RdRecord[] {
  if (Array.isArray(data)) return data.filter((x): x is RdRecord => typeof x === "object" && x !== null);
  if (data && typeof data === "object") {
    const obj = data as RdRecord;
    for (const key of ["data", "items", "results", "assets", "campaigns", "emails", "conversions"]) {
      const v = obj[key];
      if (Array.isArray(v)) return v.filter((x): x is RdRecord => typeof x === "object" && x !== null);
    }
    return [obj];
  }
  return [];
}

function pickNumericFields(rec: RdRecord): Array<[string, number]> {
  const out: Array<[string, number]> = [];
  const walk = (val: unknown, path: string) => {
    if (val == null) return;
    if (typeof val === "number" && Number.isFinite(val)) {
      out.push([path, val]);
      return;
    }
    if (typeof val === "string" && /^-?\d+([.,]\d+)?$/.test(val)) {
      out.push([path, Number(val.replace(",", "."))]);
      return;
    }
    if (Array.isArray(val)) {
      val.forEach((v, i) => walk(v, path ? `${path}[${i}]` : `[${i}]`));
      return;
    }
    if (typeof val === "object") {
      for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
        walk(v, path ? `${path}.${k}` : k);
      }
    }
  };
  for (const [k, v] of Object.entries(rec)) walk(v, k);
  return out;
}

function rdNum(rec: RdRecord, key: string): number | null {
  const v = rec[key];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && /^-?\d+([.,]\d+)?$/.test(v)) return Number(v.replace(",", "."));
  return null;
}

function rdEmailSentEstimate(rec: RdRecord): number | null {
  const contacts = rdNum(rec, "contacts_count") ?? rdNum(rec, "leads_count");
  const dropped = rdNum(rec, "email_dropped_count") ?? 0;
  if (contacts == null) return null;
  return Math.max(contacts - dropped, 0);
}

function rdEmailSentRateEstimate(rec: RdRecord): number | null {
  const contacts = rdNum(rec, "contacts_count") ?? rdNum(rec, "leads_count");
  const sent = rdEmailSentEstimate(rec);
  if (!contacts || sent == null) return null;
  return (sent / contacts) * 100;
}

function isRdEmailPossiblyUnconsolidated(rec: RdRecord): boolean {
  const contacts = rdNum(rec, "contacts_count") ?? rdNum(rec, "leads_count") ?? 0;
  const dropped = rdNum(rec, "email_dropped_count") ?? 0;
  const sentEstimate = rdEmailSentEstimate(rec) ?? 0;
  const delivered = rdNum(rec, "email_delivered_count") ?? 0;
  const opened = rdNum(rec, "email_opened_count") ?? 0;
  const clicked = rdNum(rec, "email_clicked_count") ?? 0;
  const deliveredRate = rdNum(rec, "email_delivered_rate") ?? 0;

  return contacts > 0 && dropped > 0 && sentEstimate > 0 && delivered === 0 && opened === 0 && clicked === 0 && deliveredRate === 0;
}

function rdVisibleNumericFields(
  rec: RdRecord,
  kind: "conversions" | "emails",
  leafOf: (key: string) => string,
): Array<[string, number]> {
  const hasContactsCount = rdNum(rec, "contacts_count") != null;
  const numeric = pickNumericFields(rec).filter(([k]) => {
    const leaf = leafOf(k);
    return !RD_ID_KEYS.has(leaf) && !(hasContactsCount && leaf === "leads_count");
  });
  if (kind !== "emails") return numeric;

  const withEstimate = [...numeric];
  const sentEstimate = rdEmailSentEstimate(rec);
  const sentRateEstimate = rdEmailSentRateEstimate(rec);
  if (sentEstimate != null && !withEstimate.some(([k]) => leafOf(k) === "email_sent_count_estimate")) {
    const deliveredIndex = withEstimate.findIndex(([k]) => leafOf(k) === "email_delivered_count");
    withEstimate.splice(deliveredIndex >= 0 ? deliveredIndex : withEstimate.length, 0, ["email_sent_count_estimate", sentEstimate]);
  }
  if (sentRateEstimate != null && !withEstimate.some(([k]) => leafOf(k) === "email_sent_rate_estimate")) {
    const deliveredRateIndex = withEstimate.findIndex(([k]) => leafOf(k) === "email_delivered_rate");
    withEstimate.splice(deliveredRateIndex >= 0 ? deliveredRateIndex : withEstimate.length, 0, ["email_sent_rate_estimate", sentRateEstimate]);
  }

  if (!isRdEmailPossiblyUnconsolidated(rec)) return withEstimate;
  return withEstimate.filter(([k]) => !RD_INCOMPLETE_EMAIL_KEYS.has(leafOf(k)));
}

function rdStatusLabel(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const normalized = value.trim().toLowerCase();
  const map: Record<string, string> = {
    finished: "Finalizado",
    scheduled: "Agendado",
    draft: "Rascunho",
    sending: "Enviando",
    sent: "Enviado",
    canceled: "Cancelado",
    paused: "Pausado",
  };
  return map[normalized] ?? value;
}


const RD_HIGHLIGHT_KEYS = [
  "conversion_count",
  "visits_count",
  "conversion_rate",
  "contacts_count",
  "leads_count",
  "email_sent_count_estimate",
  "email_sent_rate_estimate",
  "email_dropped_count",
  "email_delivered_count",
  "email_opened_count",
  "email_clicked_count",
  "email_bounced_count",
  "email_unsubscribed_count",
  "email_spam_reported_count",
  "email_delivered_rate",
  "email_opened_rate",
  "email_clicked_rate",
];

function rdItemTitle(rec: RdRecord, index: number): string {
  const campaignName = typeof rec.campaign_name === "string" ? rec.campaign_name.trim() : "";
  const emailName = typeof rec.name === "string" ? rec.name.trim() : "";
  const assetType = typeof rec.asset_type === "string" ? rec.asset_type : null;
  const assetId = rec.asset_id ?? rec.asset_identifier;
  const campaignId = rec.campaign_id;
  if (campaignName && campaignId != null) return `${campaignName} · Campanha #${campaignId}`;
  if (campaignName) return campaignName;
  if (emailName && campaignId != null) return `${emailName} · Campanha #${campaignId}`;
  if (emailName) return emailName;
  if (assetId != null) {
    const typeLabel = assetType ? rdLabel(assetType) : "Ativo";
    return `${typeLabel} #${assetId}`;
  }
  if (campaignId != null) return `Campanha #${campaignId}`;
  return `Item ${index + 1}`;
}

const RD_CHART_COLOR = "hsl(var(--primary))";

function RdBlock({ title, settled, kind }: { title: string; settled: RdSettled; kind: "conversions" | "emails" }) {
  if (settled.error) {
    if (isDisabledError(settled.error)) return null;
    const permission = isPermissionError(settled.error);
    return (
      <section className="space-y-2 rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4 text-xs">
        <h3 className="text-sm font-semibold leading-tight">{title}</h3>
        {permission ? (
          <p className="text-muted-foreground">
            Sem permissão da API do RD Station para este endpoint. O App OAuth da agência precisa ter o escopo <strong>Analytics</strong> aprovado, e a conta cliente precisa estar em um plano que inclua esse recurso.
          </p>
        ) : (
          <p className="text-destructive">{settled.error}</p>
        )}
      </section>
    );
  }


  const records = extractRdRecords(settled.data);
  if (records.length === 0) {
    return (
      <section className="space-y-3 rounded-2xl border border-border/40 bg-background/40 p-4">
        <h3 className="text-sm font-semibold leading-tight">{title}</h3>
        <p className="text-xs text-muted-foreground">Sem dados para o período selecionado.</p>
      </section>
    );
  }

  const primaryKey = kind === "conversions" ? "conversion_count" : "email_delivered_count";
  const primaryLabel = rdLabel(primaryKey);

  const leafOf = (k: string) => k.split(/[.\[\]]/).filter(Boolean).pop() ?? k;

  // Totals across all records, aggregated by leaf key
  const totals: Record<string, number> = {};
  for (const rec of records) {
    for (const [k, v] of rdVisibleNumericFields(rec, kind, leafOf)) {
      const leaf = leafOf(k);
      if (RD_ID_KEYS.has(leaf) || RD_RATE_KEYS.has(leaf)) continue;
      totals[leaf] = (totals[leaf] ?? 0) + v;
    }
  }
  const highlightTotals = RD_HIGHLIGHT_KEYS
    .filter((k) => totals[k] != null && !RD_RATE_KEYS.has(k))
    .slice(0, 6);

  // Chart data — top N by primary metric
  const chartData = records
    .map((rec, i) => {
      const flat = pickNumericFields(rec);
      const match = flat.find(([k]) => leafOf(k) === primaryKey);
      return { name: rdItemTitle(rec, i), value: match ? match[1] : 0 };
    })
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);


  return (
    <section className="space-y-4 rounded-2xl border border-border/40 bg-background/40 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold leading-tight">{title}</h3>
        <p className="text-[11px] text-muted-foreground">{records.length} {records.length === 1 ? "registro" : "registros"}</p>
      </div>

      {highlightTotals.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {highlightTotals.map((k) => (
            <div key={k} className="rounded-xl border border-border/40 bg-background/60 p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{rdLabel(k)}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{formatRdValue(k, totals[k])}</p>
            </div>
          ))}
        </div>
      )}

      {chartData.length > 1 && (
        <div className="rounded-xl border border-border/40 bg-background/40 p-3">
          <p className="mb-2 text-[11px] font-medium text-muted-foreground">{primaryLabel} por {kind === "conversions" ? "ativo" : "campanha"}</p>
          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer>
              <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(v: number) => v.toLocaleString("pt-BR")}
                  contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", fontSize: 12 }}
                />
                <Bar dataKey="value" fill={RD_CHART_COLOR} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">
        {kind === "emails"
          ? "O RD Station consolida métricas de e-mail com atraso. Quando a API retorna zeros para uma campanha já enviada, o painel mostra apenas os totais confiáveis até a consolidação."
          : "As conversões do RD Station são contabilizadas na data do evento. Amplie o período se estiver vendo zeros."}
      </p>

      <div className="space-y-3">
        {records
          .map((rec, i) => {
            const numeric = rdVisibleNumericFields(rec, kind, leafOf);
            const primaryMatch = numeric.find(([k]) => leafOf(k) === primaryKey);
            const primary = primaryMatch ? primaryMatch[1] : 0;
            const anyNonZero = numeric.some(([, v]) => v > 0);
            const pending = kind === "emails" && isRdEmailPossiblyUnconsolidated(rec);
            return { rec, i, numeric, primary, anyNonZero, pending };
          })
          .filter((x) => x.numeric.length > 0 && x.anyNonZero)
          .sort((a, b) => b.primary - a.primary)

          .map(({ rec, i, numeric, pending }) => (
            <div key={i} className="rounded-xl border border-border/40 bg-background/60 p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-medium">{rdItemTitle(rec, i)}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5 text-[10px] text-muted-foreground">
                    {typeof rec.send_at === "string" && <span>Enviado em {new Date(rec.send_at).toLocaleDateString("pt-BR")}</span>}
                    {rec.email_id != null && <span>E-mail #{String(rec.email_id)}</span>}
                  </div>
                </div>
                <div className="flex flex-wrap justify-end gap-1.5">
                  {rdStatusLabel(rec.status) && (
                    <Badge variant="secondary" className="text-[10px]">
                      {rdStatusLabel(rec.status)}
                    </Badge>
                  )}
                  {pending && (
                    <Badge variant="outline" className="text-[10px]">
                      RD consolidando métricas
                    </Badge>
                  )}
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
                {numeric.map(([k, v]) => (
                  <div key={k} className="rounded-lg bg-muted/40 px-2 py-1.5">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{rdLabel(leafOf(k))}</p>
                    <p className="text-sm font-semibold tabular-nums">{formatRdValue(leafOf(k), v)}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
      </div>
    </section>
  );
}


function RDStationSection({ data }: { data: RdData }) {
  const showConversions = data.showConversions !== false;
  const showEmails = data.showEmails !== false;
  const conversionsBlock = showConversions ? <RdBlock title="Conversões" settled={data.conversions} kind="conversions" /> : null;
  const emailsBlock = showEmails ? <RdBlock title="E-mail marketing" settled={data.emails} kind="emails" /> : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold leading-tight">
            RD Station Marketing{data.accountName ? ` · ${data.accountName}` : ""}
          </h2>
          <p className="text-[11px] text-muted-foreground">
            Período: {new Date(data.range.start_date).toLocaleDateString("pt-BR")} → {new Date(data.range.end_date).toLocaleDateString("pt-BR")}
          </p>
        </div>
      </div>
      {conversionsBlock}
      {emailsBlock}
      {!conversionsBlock && !emailsBlock && (
        <div className="rounded-2xl border border-border/40 bg-background/40 p-4 text-xs text-muted-foreground">
          Nenhum relatório do RD Station habilitado para este cliente.
        </div>
      )}
    </div>
  );
}



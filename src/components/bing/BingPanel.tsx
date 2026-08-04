import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getBingMetrics, getBingAiCitations } from "@/lib/bing.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Search,
  LayoutPanelTop,
  MousePointer2,
  Eye,
  BarChart3,
  Loader2,
  AlertCircle,
  Sparkles,
  ExternalLink,
} from "lucide-react";

const num = (v: unknown): number =>
  typeof v === "number" && Number.isFinite(v) ? v : Number(v) || 0;

export function BingPanel({
  reportId,
  dateFrom,
  dateTo,
}: {
  reportId: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const fetchMetrics = useServerFn(getBingMetrics);
  const fetchCitations = useServerFn(getBingAiCitations);

  const { data, isLoading, error } = useQuery({
    queryKey: ["bing-metrics", reportId, dateFrom, dateTo],
    queryFn: () => fetchMetrics({ data: { reportId, dateFrom, dateTo } }),
  });

  const { data: ai, isLoading: aiLoading } = useQuery({
    queryKey: ["bing-ai-citations", reportId],
    queryFn: () => fetchCitations({ data: { reportId } }),
    enabled: !!data?.connected,
  });

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center rounded-2xl border border-border/40 bg-background/40">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="glass-strong flex flex-col items-center justify-center rounded-3xl border-none p-12 text-center">
        <AlertCircle className="mb-4 h-10 w-10 text-destructive/60" />
        <h3 className="text-sm font-semibold text-foreground">
          Não foi possível carregar os dados do Bing
        </h3>
        <p className="max-w-md text-xs text-muted-foreground">{(error as Error).message}</p>
      </Card>
    );
  }

  if (!data?.connected) {
    return (
      <Card className="glass-strong flex flex-col items-center justify-center rounded-3xl border-none p-12 text-center">
        <AlertCircle className="mb-4 h-10 w-10 text-muted-foreground/50" />
        <h3 className="text-sm font-semibold text-foreground">Bing não conectado</h3>
        <p className="max-w-xs text-xs text-muted-foreground">
          Conecte sua conta do Bing Webmaster Tools nas configurações do relatório para visualizar
          estes dados.
        </p>
      </Card>
    );
  }

  const metrics = (data.metrics || []).map((m: any) => ({
    date: m?.date ?? "",
    clicks: num(m?.clicks),
    impressions: num(m?.impressions),
    ctr: num(m?.ctr),
    position: num(m?.position),
  }));
  const topKeywords = (data.topKeywords || []).map((kw: any) => ({
    query: typeof kw?.query === "string" ? kw.query : "—",
    clicks: num(kw?.clicks),
    impressions: num(kw?.impressions),
    ctr: num(kw?.ctr),
    position: num(kw?.position),
  }));

  const totalClicks = metrics.reduce((acc: number, m: any) => acc + m.clicks, 0);
  const totalImpressions = metrics.reduce((acc: number, m: any) => acc + m.impressions, 0);
  const avgCtr = metrics.length ? metrics.reduce((a: number, m: any) => a + m.ctr, 0) / metrics.length : 0;
  const avgPos = metrics.length ? metrics.reduce((a: number, m: any) => a + m.position, 0) / metrics.length : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="Cliques" value={totalClicks} sub="Cliques totais" icon={<MousePointer2 className="h-4 w-4" />} />
        <KpiCard label="Impressões" value={totalImpressions} sub="Aparições na busca" icon={<Eye className="h-4 w-4" />} />
        <KpiCard label="CTR Médio" value={avgCtr} sub="Taxa de clique" icon={<BarChart3 className="h-4 w-4" />} isPercent />
        <KpiCard label="Posição Média" value={avgPos} sub="Posição no ranking" icon={<LayoutPanelTop className="h-4 w-4" />} isDecimal />
      </div>

      <Card className="glass-strong overflow-hidden rounded-3xl border-none">
        <CardHeader className="border-b border-border/10">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <BarChart3 className="h-4 w-4 text-primary" /> Desempenho ao longo do tempo
            </CardTitle>
            <Badge variant="outline" className="border-primary/20 bg-primary/5 px-2 text-[10px] text-primary">
              {data.siteUrl}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics}>
                <defs>
                  <linearGradient id="bingClicks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) =>
                    val ? new Date(val).toLocaleDateString("pt-BR", { day: "numeric", month: "short" }) : ""
                  }
                />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "12px",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="clicks"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#bingClicks)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-strong overflow-hidden rounded-3xl border-none">
        <CardHeader className="border-b border-border/10">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-primary" /> Citações por IA (Copilot)
            </CardTitle>
            <Badge variant="outline" className="border-primary/20 bg-primary/5 text-[10px] text-primary">
              AI Performance
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {aiLoading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : ai?.available ? (
            <>
              <div className="grid grid-cols-2 gap-4 p-4">
                <MiniStat label="Citações totais" value={(ai.totals?.citations ?? 0).toLocaleString("pt-BR")} />
                <MiniStat label="Páginas citadas" value={(ai.totals?.pages ?? 0).toLocaleString("pt-BR")} />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Página / Consulta</th>
                      <th className="px-4 py-3 text-right">Citações</th>
                      <th className="px-4 py-3 text-right">Impressões</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/10">
                    {ai.citations.map((c: any, i: number) => (
                      <tr key={i} className="transition-colors hover:bg-muted/10">
                        <td className="max-w-[420px] truncate px-4 py-4 font-medium">{c.query ?? c.url}</td>
                        <td className="px-4 py-4 text-right tabular-nums">{c.citations.toLocaleString("pt-BR")}</td>
                        <td className="px-4 py-4 text-right tabular-nums">{c.impressions.toLocaleString("pt-BR")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="space-y-3 p-6 text-center">
              <p className="text-xs text-muted-foreground">
                O relatório <strong className="text-foreground">AI Performance</strong> do Bing (citações
                em Microsoft Copilot e respostas geradas por IA) ainda está em preview e{" "}
                <strong className="text-foreground">não possui endpoint público na API</strong>. Assim
                que a Microsoft liberar, os dados aparecem aqui automaticamente.
              </p>
              <a
                href="https://www.bing.com/webmasters/aiperformance"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
              >
                Ver no Bing Webmaster Tools <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="glass-strong overflow-hidden rounded-3xl border-none">
        <CardHeader className="border-b border-border/10">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Search className="h-4 w-4 text-primary" /> Termos de Pesquisa Principais
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Termo</th>
                  <th className="px-4 py-3 text-right">Cliques</th>
                  <th className="px-4 py-3 text-right">Impressões</th>
                  <th className="px-4 py-3 text-right">CTR</th>
                  <th className="px-4 py-3 text-right">Posição</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/10">
                {topKeywords.length === 0 && (
                  <tr>
                    <td className="px-4 py-8 text-center text-xs text-muted-foreground" colSpan={5}>
                      Sem dados de palavras-chave disponíveis para esta propriedade ainda.
                    </td>
                  </tr>
                )}
                {topKeywords.map((kw: any, i: number) => (
                  <tr key={i} className="transition-colors hover:bg-muted/10">
                    <td className="px-4 py-4 font-medium">{kw.query}</td>
                    <td className="px-4 py-4 text-right tabular-nums">{kw.clicks.toLocaleString("pt-BR")}</td>
                    <td className="px-4 py-4 text-right tabular-nums">{kw.impressions.toLocaleString("pt-BR")}</td>
                    <td className="px-4 py-4 text-right tabular-nums">{kw.ctr.toFixed(1)}%</td>
                    <td className="px-4 py-4 text-right font-semibold tabular-nums">{kw.position.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  icon,
  isPercent,
  isDecimal,
}: {
  label: string;
  value: number;
  sub: string;
  icon: React.ReactNode;
  isPercent?: boolean;
  isDecimal?: boolean;
}) {
  return (
    <Card className="glass-strong rounded-2xl border-none">
      <CardContent className="space-y-2 p-4">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold tracking-tight">
            {isPercent ? `${value.toFixed(1)}%` : isDecimal ? value.toFixed(1) : value.toLocaleString("pt-BR")}
          </p>
          <p className="text-[10px] text-muted-foreground">{sub}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/40 bg-background/40 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-xl font-bold tracking-tight">{value}</p>
    </div>
  );
}

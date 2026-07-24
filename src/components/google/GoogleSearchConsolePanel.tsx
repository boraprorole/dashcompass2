import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getGscMetrics } from "@/lib/gsc.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Search, MousePointer2, Eye, LayoutPanelTop, BarChart3 } from "lucide-react";

export function GoogleSearchConsolePanel({ reportId, dateFrom, dateTo }: { reportId: string; dateFrom?: string; dateTo?: string }) {
  const fetchGsc = useServerFn(getGscMetrics);
  const { data, isLoading } = useQuery({
    queryKey: ["gsc-metrics", reportId, dateFrom, dateTo],
    queryFn: () => fetchGsc({ data: { reportId, dateFrom, dateTo } }),
  });

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center rounded-2xl border border-border/40 bg-background/40">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Cliques" value={data.clicks} sub="Cliques totais" icon={<MousePointer2 className="h-4 w-4" />} />
        <KpiCard label="Impressões" value={data.impressions} sub="Aparições na busca" icon={<Eye className="h-4 w-4" />} />
        <KpiCard label="CTR Médio" value={data.ctr} sub="Taxa de clique" icon={<BarChart3 className="h-4 w-4" />} isPercent />
        <KpiCard label="Posição Média" value={data.position} sub="Posição no ranking" icon={<LayoutPanelTop className="h-4 w-4" />} isDecimal />
      </div>

      <Card className="glass-strong border-none rounded-3xl overflow-hidden">
        <CardHeader className="border-b border-border/10">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
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
                </tr>
              </thead>
              <tbody className="divide-y divide-border/10">
                {data.keywords.map((k, i) => (
                  <tr key={i} className="hover:bg-muted/10 transition-colors">
                    <td className="px-4 py-4 font-medium">{k.query}</td>
                    <td className="px-4 py-4 text-right">{k.clicks.toLocaleString('pt-BR')}</td>
                    <td className="px-4 py-4 text-right">{k.impressions.toLocaleString('pt-BR')}</td>
                    <td className="px-4 py-4 text-right">{k.ctr.toFixed(1)}%</td>
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

function KpiCard({ label, value, sub, icon, isPercent, isDecimal }: { label: string; value: number; sub: string; icon: React.ReactNode; isPercent?: boolean; isDecimal?: boolean }) {
  return (
    <Card className="glass-strong border-none rounded-2xl">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-[10px] uppercase tracking-wider font-semibold">{label}</span>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold tracking-tight">
            {isPercent ? `${value.toFixed(1)}%` : isDecimal ? value.toFixed(1) : value.toLocaleString('pt-BR')}
          </p>
          <p className="text-[10px] text-muted-foreground">{sub}</p>
        </div>
      </CardContent>
    </Card>
  );
}

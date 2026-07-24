import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getGadsMetrics } from "@/lib/gads.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Presentation, TrendingUp, Target, MousePointer2, BarChart3 } from "lucide-react";

export function GoogleAdsPanel({ reportId, dateFrom, dateTo }: { reportId: string; dateFrom?: string; dateTo?: string }) {
  const fetchGads = useServerFn(getGadsMetrics);
  const { data, isLoading } = useQuery({
    queryKey: ["gads-metrics", reportId, dateFrom, dateTo],
    queryFn: () => fetchGads({ data: { reportId, dateFrom, dateTo } }),
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
        <KpiCard label="Investimento" value={data.cost} sub="Total no período" icon={<TrendingUp className="h-4 w-4" />} isCurrency />
        <KpiCard label="Cliques" value={data.clicks} sub="Tráfego gerado" icon={<MousePointer2 className="h-4 w-4" />} />
        <KpiCard label="Conversões" value={data.conversions} sub="Leads / Vendas" icon={<Target className="h-4 w-4" />} />
        <KpiCard label="CPC Médio" value={data.cpc} sub="Custo por clique" icon={<BarChart3 className="h-4 w-4" />} isCurrency />
      </div>

      <Card className="glass-strong border-none rounded-3xl overflow-hidden">
        <CardHeader className="border-b border-border/10">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Presentation className="h-4 w-4 text-primary" /> Campanhas Principais
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Campanha</th>
                  <th className="px-4 py-3 text-right">Custo</th>
                  <th className="px-4 py-3 text-right">Conversões</th>
                  <th className="px-4 py-3 text-right">CPA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/10">
                {data.campaigns.map((c, i) => (
                  <tr key={i} className="hover:bg-muted/10 transition-colors">
                    <td className="px-4 py-4 font-medium">{c.name}</td>
                    <td className="px-4 py-4 text-right">{c.cost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                    <td className="px-4 py-4 text-right">{c.conversions}</td>
                    <td className="px-4 py-4 text-right">{(c.cost / (c.conversions || 1)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
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

function KpiCard({ label, value, sub, icon, isCurrency }: { label: string; value: number; sub: string; icon: React.ReactNode; isCurrency?: boolean }) {
  return (
    <Card className="glass-strong border-none rounded-2xl">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-[10px] uppercase tracking-wider font-semibold">{label}</span>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold tracking-tight">
            {isCurrency ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : value.toLocaleString('pt-BR')}
          </p>
          <p className="text-[10px] text-muted-foreground">{sub}</p>
        </div>
      </CardContent>
    </Card>
  );
}

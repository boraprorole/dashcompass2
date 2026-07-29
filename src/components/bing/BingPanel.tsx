import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getBingMetrics } from "@/lib/bing.functions";
import { Card } from "@/components/ui/card";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Search, TrendingUp, MousePointer2, BarChart3, Target, Loader2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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

  const { data, isLoading, error } = useQuery({
    queryKey: ["bing-metrics", reportId, dateFrom, dateTo],
    queryFn: () => fetchMetrics({ data: { reportId, dateFrom, dateTo } }),
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data?.connected) {
    return (
      <Card className="glass flex flex-col items-center justify-center p-12 text-center">
        <AlertCircle className="mb-4 h-12 w-12 text-muted-foreground/50" />
        <h3 className="text-lg font-semibold text-foreground">Bing não conectado</h3>
        <p className="max-w-xs text-sm text-muted-foreground">
          Conecte sua conta do Bing Webmaster Tools nas configurações do relatório para visualizar
          estes dados.
        </p>
      </Card>
    );
  }

  const metrics = data.metrics || [];
  const topKeywords = data.topKeywords || [];
  
  const totalClicks = metrics.reduce((acc: number, m: any) => acc + m.clicks, 0);
  const totalImpressions = metrics.reduce((acc: number, m: any) => acc + m.impressions, 0);
  const avgCtr = metrics.length > 0 ? metrics.reduce((acc: number, m: any) => acc + m.ctr, 0) / metrics.length : 0;
  const avgPos = metrics.length > 0 ? metrics.reduce((acc: number, m: any) => acc + m.position, 0) / metrics.length : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-xl bg-blue-500/10 p-2 text-blue-500">
            <Search className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Bing Webmaster Tools</h2>
            <p className="text-xs text-muted-foreground">{data.siteUrl}</p>
          </div>
        </div>
        <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20 px-3 py-1 text-[10px] font-bold">
          CONECTADO
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Cliques totais" value={totalClicks.toLocaleString()} icon={<MousePointer2 className="h-4 w-4" />} color="blue" />
        <KpiCard label="Impressões totais" value={totalImpressions.toLocaleString()} icon={<BarChart3 className="h-4 w-4" />} color="purple" />
        <KpiCard label="CTR médio" value={`${avgCtr.toFixed(2)}%`} icon={<Target className="h-4 w-4" />} color="green" />
        <KpiCard label="Posição média" value={avgPos.toFixed(1)} icon={<TrendingUp className="h-4 w-4" />} color="orange" />
      </div>

      <Card className="glass p-6">
        <h3 className="mb-6 text-sm font-semibold">Desempenho ao longo do tempo</h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={metrics}>
              <defs>
                <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3DFC03" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3DFC03" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="#ffffff40"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => new Date(val).toLocaleDateString("pt-BR", { day: "numeric", month: "short" })}
              />
              <YAxis stroke="#ffffff40" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: "#1a1a1c", border: "1px solid #ffffff10", borderRadius: "12px", fontSize: "12px" }}
              />
              <Area
                type="monotone"
                dataKey="clicks"
                stroke="#3DFC03"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorClicks)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-1">
        <Card className="glass overflow-hidden">
          <div className="border-b border-white/5 bg-white/5 px-6 py-4">
            <h3 className="text-sm font-semibold text-foreground">Top Palavras-chave</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/5 bg-white/5 text-muted-foreground">
                  <th className="px-6 py-3 font-medium">Query</th>
                  <th className="px-6 py-3 font-medium text-right">Cliques</th>
                  <th className="px-6 py-3 font-medium text-right">Impressões</th>
                  <th className="px-6 py-3 font-medium text-right">CTR</th>
                  <th className="px-6 py-3 font-medium text-right">Posição</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {topKeywords.map((kw: any, idx: number) => (
                  <tr key={idx} className="hover:bg-white/5">
                    <td className="px-6 py-4 font-medium text-foreground">{kw.query}</td>
                    <td className="px-6 py-4 text-right tabular-nums">{kw.clicks.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right tabular-nums">{kw.impressions.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right tabular-nums text-primary">{kw.ctr.toFixed(2)}%</td>
                    <td className="px-6 py-4 text-right tabular-nums font-semibold">{kw.position.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) {
  const colors: any = {
    blue: "text-blue-500 bg-blue-500/10",
    purple: "text-purple-500 bg-purple-500/10",
    green: "text-green-500 bg-green-500/10",
    orange: "text-orange-500 bg-orange-500/10",
  };
  return (
    <Card className="glass flex items-center gap-4 p-4">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${colors[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-lg font-bold text-foreground">{value}</p>
      </div>
    </Card>
  );
}

import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  listGoogleAdsDatasets,
  getGoogleAdsDataset,
} from "@/lib/googleads-csv.functions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import {
  BarChart,
  Bar,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function fmtInt(n: number) {
  return new Intl.NumberFormat("pt-BR").format(Math.round(n));
}
function fmtMoney(n: number, currency = "BRL") {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(n);
}
function fmtPct(n: number) {
  return `${n.toFixed(2).replace(".", ",")}%`;
}

export function GoogleAdsCsvPanel({ reportId }: { reportId: string }) {
  const listFn = useServerFn(listGoogleAdsDatasets);
  const getFn = useServerFn(getGoogleAdsDataset);

  const listQ = useQuery({
    queryKey: ["gads-csv-report", reportId],
    queryFn: () => listFn({ data: { reportId } }),
  });

  const [selected, setSelected] = useState<string | null>(null);
  const datasets = listQ.data ?? [];
  const active = selected ?? datasets[0]?.id ?? null;

  const dsQ = useQuery({
    queryKey: ["gads-csv-dataset", active],
    queryFn: () => getFn({ data: { datasetId: active! } }),
    enabled: !!active,
  });

  const totals = useMemo(() => {
    const c = dsQ.data?.campaigns ?? [];
    const clicks = c.reduce((s, r) => s + (r.clicks ?? 0), 0);
    const impressions = c.reduce((s, r) => s + (r.impressions ?? 0), 0);
    const cost = c.reduce((s, r) => s + Number(r.cost ?? 0), 0);
    const conversions = c.reduce((s, r) => s + Number(r.conversions ?? 0), 0);
    return {
      clicks,
      impressions,
      cost,
      conversions,
      ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
      cpc: clicks > 0 ? cost / clicks : 0,
      cpa: conversions > 0 ? cost / conversions : 0,
    };
  }, [dsQ.data]);

  if (listQ.isLoading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
      </div>
    );
  }
  if (datasets.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
        Ainda não há relatórios de Google Ads (CSV) importados para esta empresa.
      </div>
    );
  }

  const currency = dsQ.data?.dataset.currency || "BRL";
  const topByCost = [...(dsQ.data?.campaigns ?? [])].sort((a, b) => Number(b.cost) - Number(a.cost));
  const chartData = topByCost.slice(0, 10).map((r) => ({
    name: r.campaign_name.length > 22 ? r.campaign_name.slice(0, 22) + "…" : r.campaign_name,
    cost: Number(r.cost),
    conversions: Number(r.conversions),
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge className="bg-primary/10 text-primary hover:bg-primary/15">Google Ads · Relatório</Badge>
        <Select value={active ?? undefined} onValueChange={(v) => setSelected(v)}>
          <SelectTrigger className="h-8 w-[280px] text-xs">
            <SelectValue placeholder="Selecione o período" />
          </SelectTrigger>
          <SelectContent>
            {datasets.map((d) => (
              <SelectItem key={d.id} value={d.id} className="text-xs">
                {d.period_label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {dsQ.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando dataset…
        </div>
      ) : dsQ.data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi label="Investimento" value={fmtMoney(totals.cost, currency)} />
            <Kpi label="Cliques" value={fmtInt(totals.clicks)} />
            <Kpi label="Impressões" value={fmtInt(totals.impressions)} />
            <Kpi label="CTR" value={fmtPct(totals.ctr)} />
            <Kpi label="CPC médio" value={fmtMoney(totals.cpc, currency)} />
            <Kpi label="Conversões" value={fmtInt(totals.conversions)} />
            <Kpi label="CPA" value={fmtMoney(totals.cpa, currency)} />
            <Kpi label="Campanhas" value={fmtInt(dsQ.data.campaigns.length)} />
          </div>

          {chartData.length > 0 && (
            <div className="rounded-2xl border border-border/50 bg-card/60 p-4">
              <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
                Top 10 campanhas por investimento
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                    angle={-25}
                    textAnchor="end"
                    interval={0}
                    height={60}
                  />
                  <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <Tooltip
                    formatter={(v: number, k: string) =>
                      k === "cost" ? [fmtMoney(v, currency), "Custo"] : [fmtInt(v), "Conversões"]
                    }
                    contentStyle={{
                      background: "var(--background)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="cost" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="rounded-2xl border border-border/50 bg-card/60 p-4 overflow-x-auto">
            <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
              Campanhas
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Campanha</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 pr-3 font-medium text-right">Cliques</th>
                  <th className="py-2 pr-3 font-medium text-right">Impr.</th>
                  <th className="py-2 pr-3 font-medium text-right">CTR</th>
                  <th className="py-2 pr-3 font-medium text-right">CPC</th>
                  <th className="py-2 pr-3 font-medium text-right">Custo</th>
                  <th className="py-2 pr-3 font-medium text-right">Conv.</th>
                  <th className="py-2 font-medium text-right">CPA</th>
                </tr>
              </thead>
              <tbody>
                {topByCost.map((r) => (
                  <tr key={r.id} className="border-b border-border/20">
                    <td className="py-2 pr-3">{r.campaign_name}</td>
                    <td className="py-2 pr-3 text-xs text-muted-foreground">{r.status ?? "—"}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{fmtInt(r.clicks)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{fmtInt(r.impressions)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {fmtPct(r.impressions > 0 ? (r.clicks / r.impressions) * 100 : 0)}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {fmtMoney(Number(r.avg_cpc), currency)}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {fmtMoney(Number(r.cost), currency)}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {fmtInt(Number(r.conversions))}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {Number(r.conversions) > 0
                        ? fmtMoney(Number(r.cost) / Number(r.conversions), currency)
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/50 bg-background/60 p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

import { useMemo, useState } from "react";
import unorteData from "@/data/unorte-google-ads.json";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Row = {
  campaign: string;
  status: string;
  type: string;
  clicks: number;
  impressions: number;
  ctr: number;
  cpc: number;
  cost: number;
  impr_top: number;
  impr_abs_top: number;
  conversions: number;
  view_conv: number;
  cost_per_conv: number;
  conv_rate: number;
};
type Period = { id: string; label: string; start: string; end: string; rows: Row[] };
const DATA = unorteData as { periods: Period[] };

const fmtInt = (n: number) => new Intl.NumberFormat("pt-BR").format(Math.round(n));
const fmtMoney = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 }).format(n);
const fmtPct = (n: number) => `${n.toFixed(2).replace(".", ",")}%`;

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border/50 bg-background/60 p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

export function UnorteGoogleAdsCsvPanel() {
  const [periodId, setPeriodId] = useState(DATA.periods[DATA.periods.length - 1].id);
  const [segment, setSegment] = useState<"all" | "grad" | "pos">("all");
  const period = DATA.periods.find((p) => p.id === periodId)!;
  const rows = useMemo(() => {
    if (segment === "all") return period.rows;
    if (segment === "grad") return period.rows.filter((r) => /grad/i.test(r.campaign));
    return period.rows.filter((r) => /\bpos\b|pós|pos[-_ ]/i.test(r.campaign));
  }, [period, segment]);

  const totals = useMemo(() => {
    const cost = rows.reduce((s, r) => s + r.cost, 0);
    const clicks = rows.reduce((s, r) => s + r.clicks, 0);
    const impressions = rows.reduce((s, r) => s + r.impressions, 0);
    const conversions = rows.reduce((s, r) => s + r.conversions, 0);
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    const cpc = clicks > 0 ? cost / clicks : 0;
    const cpm = impressions > 0 ? (cost / impressions) * 1000 : 0;
    const cpa = conversions > 0 ? cost / conversions : 0;
    const convRate = clicks > 0 ? (conversions / clicks) * 100 : 0;
    return { cost, clicks, impressions, conversions, ctr, cpc, cpm, cpa, convRate };
  }, [rows]);

  const activeRows = useMemo(
    () => [...rows].sort((a, b) => b.cost - a.cost),
    [rows]
  );

  const top10 = activeRows.slice(0, 10).filter((r) => r.cost > 0).map((r) => ({
    name: r.campaign.length > 26 ? r.campaign.slice(0, 26) + "…" : r.campaign,
    cost: r.cost,
    conversions: r.conversions,
  }));

  const byType = useMemo(() => {
    const map = new Map<string, { type: string; cost: number; clicks: number; conversions: number }>();
    for (const r of rows) {
      const t = r.type || "—";
      const cur = map.get(t) ?? { type: t, cost: 0, clicks: 0, conversions: 0 };
      cur.cost += r.cost;
      cur.clicks += r.clicks;
      cur.conversions += r.conversions;
      map.set(t, cur);
    }
    return [...map.values()].filter((r) => r.cost > 0).sort((a, b) => b.cost - a.cost);
  }, [rows]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge className="bg-primary/10 text-primary hover:bg-primary/15">Google Ads · CSV</Badge>
        <Select value={periodId} onValueChange={setPeriodId}>
          <SelectTrigger className="h-8 w-[240px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DATA.periods.map((p) => (
              <SelectItem key={p.id} value={p.id} className="text-xs">
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={segment} onValueChange={(v) => setSegment(v as "all" | "grad" | "pos")}>
          <SelectTrigger className="h-8 w-[200px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">Todas campanhas</SelectItem>
            <SelectItem value="grad" className="text-xs">Campanhas GRAD</SelectItem>
            <SelectItem value="pos" className="text-xs">Campanhas POS</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-[11px] text-muted-foreground">
          {rows.length} campanhas · {activeRows.filter((r) => r.cost > 0).length} ativas no período
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Investimento" value={fmtMoney(totals.cost)} />
        <Kpi label="Cliques" value={fmtInt(totals.clicks)} />
        <Kpi label="Impressões" value={fmtInt(totals.impressions)} />
        <Kpi label="CTR" value={totals.ctr > 0 ? fmtPct(totals.ctr) : "—"} />
        <Kpi label="CPC médio" value={totals.cpc > 0 ? fmtMoney(totals.cpc) : "—"} />
        <Kpi label="CPM" value={totals.cpm > 0 ? fmtMoney(totals.cpm) : "—"} />
        <Kpi label="Conversões" value={fmtInt(totals.conversions)} />
        <Kpi label="Custo / conv." value={totals.cpa > 0 ? fmtMoney(totals.cpa) : "—"} />
        <Kpi label="Taxa de conv." value={totals.convRate > 0 ? fmtPct(totals.convRate) : "—"} />
      </div>

      {top10.length > 0 && (
        <div className="rounded-2xl border border-border/50 bg-card/60 p-4">
          <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
            Top 10 campanhas por investimento
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={top10} margin={{ top: 8, right: 8, left: 0, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                angle={-25}
                textAnchor="end"
                interval={0}
                height={80}
              />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
              <Tooltip
                formatter={(v: number, k: string) =>
                  k === "cost" ? [fmtMoney(v), "Investimento"] : [fmtInt(v), "Conversões"]
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

      {byType.length > 0 && (
        <div className="rounded-2xl border border-border/50 bg-card/60 p-4 overflow-x-auto">
          <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
            Investimento por tipo de campanha
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40 text-left text-xs text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Tipo</th>
                <th className="py-2 pr-3 font-medium text-right">Investimento</th>
                <th className="py-2 pr-3 font-medium text-right">Cliques</th>
                <th className="py-2 pr-3 font-medium text-right">Conversões</th>
                <th className="py-2 font-medium text-right">Custo / conv.</th>
              </tr>
            </thead>
            <tbody>
              {byType.map((r) => (
                <tr key={r.type} className="border-b border-border/20">
                  <td className="py-2 pr-3">{r.type}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{fmtMoney(r.cost)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{fmtInt(r.clicks)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{fmtInt(r.conversions)}</td>
                  <td className="py-2 text-right tabular-nums">
                    {r.conversions > 0 ? fmtMoney(r.cost / r.conversions) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="rounded-2xl border border-border/50 bg-card/60 p-4 overflow-x-auto">
        <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
          Campanhas ({activeRows.length})
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/40 text-left text-xs text-muted-foreground">
              <th className="py-2 pr-3 font-medium">Campanha</th>
              <th className="py-2 pr-3 font-medium">Tipo</th>
              <th className="py-2 pr-3 font-medium">Status</th>
              <th className="py-2 pr-3 font-medium text-right">Investimento</th>
              <th className="py-2 pr-3 font-medium text-right">Cliques</th>
              <th className="py-2 pr-3 font-medium text-right">Impr.</th>
              <th className="py-2 pr-3 font-medium text-right">CTR</th>
              <th className="py-2 pr-3 font-medium text-right">CPC</th>
              <th className="py-2 pr-3 font-medium text-right">Conv.</th>
              <th className="py-2 font-medium text-right">Custo/conv.</th>
            </tr>
          </thead>
          <tbody>
            {activeRows.map((r) => (
              <tr key={r.campaign} className="border-b border-border/20">
                <td className="py-2 pr-3">{r.campaign}</td>
                <td className="py-2 pr-3 text-muted-foreground">{r.type}</td>
                <td className="py-2 pr-3 text-muted-foreground">{r.status}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{fmtMoney(r.cost)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{fmtInt(r.clicks)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{fmtInt(r.impressions)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{r.ctr > 0 ? fmtPct(r.ctr) : "—"}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{r.cpc > 0 ? fmtMoney(r.cpc) : "—"}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{fmtInt(r.conversions)}</td>
                <td className="py-2 text-right tabular-nums">
                  {r.cost_per_conv > 0 ? fmtMoney(r.cost_per_conv) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

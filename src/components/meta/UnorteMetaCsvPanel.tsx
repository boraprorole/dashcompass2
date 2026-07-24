import { useMemo, useState } from "react";
import unorteData from "@/data/unorte-meta-ads.json";
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
  adset: string;
  status: string;
  reach: number;
  impressions: number;
  frequency: number;
  result_type: string;
  results: number;
  spend: number;
  cost_per_result: number;
  clicks_link?: number;
  clicks_all?: number;
  cpc?: number;
  ctr?: number;
  age?: string;
  gender?: string;
  objective?: string;
};
type Period = { id: string; label: string; start: string; end: string; rows: Row[] };
const DATA = unorteData as { periods: Period[] };

const fmtInt = (n: number) => new Intl.NumberFormat("pt-BR").format(Math.round(n));
const fmtMoney = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 }).format(n);
const fmtPct = (n: number) => `${n.toFixed(2).replace(".", ",")}%`;
const fmtRatio = (n: number) => `${n.toFixed(2).replace(".", ",")}x`;

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border/50 bg-background/60 p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

export function UnorteMetaCsvPanel() {
  const [periodId, setPeriodId] = useState(DATA.periods[DATA.periods.length - 1].id);
  const [segment, setSegment] = useState<"all" | "grad" | "pos">("all");
  const period = DATA.periods.find((p) => p.id === periodId)!;
  const rows = useMemo(() => {
    if (segment === "all") return period.rows;
    if (segment === "grad")
      return period.rows.filter((r) => /grad/i.test(r.campaign));
    return period.rows.filter((r) => /\bpos\b|pós|pos[-_ ]/i.test(r.campaign));
  }, [period, segment]);

  const totals = useMemo(() => {
    const spend = rows.reduce((s, r) => s + r.spend, 0);
    const impressions = rows.reduce((s, r) => s + r.impressions, 0);
    const reach = rows.reduce((s, r) => s + r.reach, 0);
    const results = rows.reduce((s, r) => s + r.results, 0);
    const clicks = rows.reduce((s, r) => s + (r.clicks_all ?? 0), 0);
    const ctr = impressions > 0 && clicks > 0 ? (clicks / impressions) * 100 : 0;
    const cpc = clicks > 0 ? spend / clicks : 0;
    const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;
    const cpr = results > 0 ? spend / results : 0;
    const freq = reach > 0 ? impressions / reach : 0;
    return { spend, impressions, reach, results, clicks, ctr, cpc, cpm, cpr, freq };
  }, [rows]);

  // Aggregate by campaign
  const byCampaign = useMemo(() => {
    const map = new Map<string, { campaign: string; spend: number; impressions: number; reach: number; results: number; clicks: number }>();
    for (const r of rows) {
      const cur = map.get(r.campaign) ?? { campaign: r.campaign, spend: 0, impressions: 0, reach: 0, results: 0, clicks: 0 };
      cur.spend += r.spend;
      cur.impressions += r.impressions;
      cur.reach += r.reach;
      cur.results += r.results;
      cur.clicks += r.clicks_all ?? 0;
      map.set(r.campaign, cur);
    }
    return [...map.values()].sort((a, b) => b.spend - a.spend);
  }, [rows]);

  const top10 = byCampaign.slice(0, 10).map((c) => ({
    name: c.campaign.length > 26 ? c.campaign.slice(0, 26) + "…" : c.campaign,
    spend: c.spend,
    results: c.results,
  }));

  // Aggregate by result type
  const byResultType = useMemo(() => {
    const map = new Map<string, { type: string; spend: number; results: number }>();
    for (const r of rows) {
      const t = r.result_type || "—";
      const cur = map.get(t) ?? { type: t, spend: 0, results: 0 };
      cur.spend += r.spend;
      cur.results += r.results;
      map.set(t, cur);
    }
    return [...map.values()].sort((a, b) => b.spend - a.spend);
  }, [rows]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge className="bg-primary/10 text-primary hover:bg-primary/15">Meta Ads · CSV</Badge>
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
          {rows.length} conjuntos · {byCampaign.length} campanhas
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Investimento" value={fmtMoney(totals.spend)} />
        <Kpi label="Impressões" value={fmtInt(totals.impressions)} />
        <Kpi label="Alcance" value={fmtInt(totals.reach)} />
        <Kpi label="Frequência" value={fmtRatio(totals.freq)} />
        <Kpi label="Cliques" value={totals.clicks > 0 ? fmtInt(totals.clicks) : "—"} />
        <Kpi label="CTR" value={totals.ctr > 0 ? fmtPct(totals.ctr) : "—"} />
        <Kpi label="CPC" value={totals.cpc > 0 ? fmtMoney(totals.cpc) : "—"} />
        <Kpi label="CPM" value={fmtMoney(totals.cpm)} />
        <Kpi label="Resultados" value={fmtInt(totals.results)} />
        <Kpi label="Custo por resultado" value={totals.cpr > 0 ? fmtMoney(totals.cpr) : "—"} />
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
                  k === "spend" ? [fmtMoney(v), "Investimento"] : [fmtInt(v), "Resultados"]
                }
                contentStyle={{
                  background: "var(--background)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="spend" fill="var(--primary)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="rounded-2xl border border-border/50 bg-card/60 p-4 overflow-x-auto">
        <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
          Investimento por tipo de resultado
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/40 text-left text-xs text-muted-foreground">
              <th className="py-2 pr-3 font-medium">Tipo de resultado</th>
              <th className="py-2 pr-3 font-medium text-right">Investimento</th>
              <th className="py-2 pr-3 font-medium text-right">Resultados</th>
              <th className="py-2 font-medium text-right">Custo médio</th>
            </tr>
          </thead>
          <tbody>
            {byResultType.map((r) => (
              <tr key={r.type} className="border-b border-border/20">
                <td className="py-2 pr-3">{r.type}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{fmtMoney(r.spend)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{fmtInt(r.results)}</td>
                <td className="py-2 text-right tabular-nums">
                  {r.results > 0 ? fmtMoney(r.spend / r.results) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card/60 p-4 overflow-x-auto">
        <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
          Campanhas ({byCampaign.length})
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/40 text-left text-xs text-muted-foreground">
              <th className="py-2 pr-3 font-medium">Campanha</th>
              <th className="py-2 pr-3 font-medium text-right">Investimento</th>
              <th className="py-2 pr-3 font-medium text-right">Impressões</th>
              <th className="py-2 pr-3 font-medium text-right">Alcance</th>
              <th className="py-2 pr-3 font-medium text-right">Cliques</th>
              <th className="py-2 pr-3 font-medium text-right">CTR</th>
              <th className="py-2 pr-3 font-medium text-right">CPC</th>
              <th className="py-2 pr-3 font-medium text-right">Resultados</th>
              <th className="py-2 font-medium text-right">Custo/result.</th>
            </tr>
          </thead>
          <tbody>
            {byCampaign.map((c) => {
              const ctr = c.impressions > 0 && c.clicks > 0 ? (c.clicks / c.impressions) * 100 : 0;
              const cpc = c.clicks > 0 ? c.spend / c.clicks : 0;
              const cpr = c.results > 0 ? c.spend / c.results : 0;
              return (
                <tr key={c.campaign} className="border-b border-border/20">
                  <td className="py-2 pr-3">{c.campaign}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{fmtMoney(c.spend)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{fmtInt(c.impressions)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{fmtInt(c.reach)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{c.clicks > 0 ? fmtInt(c.clicks) : "—"}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{ctr > 0 ? fmtPct(ctr) : "—"}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{cpc > 0 ? fmtMoney(cpc) : "—"}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{fmtInt(c.results)}</td>
                  <td className="py-2 text-right tabular-nums">{cpr > 0 ? fmtMoney(cpr) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { useMemo } from "react";
import crmData from "@/data/unorte-crm.json";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  LineChart,
  Line,
} from "recharts";

type NV = { name: string; value: number };
type Data = {
  meta: {
    total_leads: number;
    funnel_name: string;
    revenue: number;
    won: number;
    lost: number;
    in_progress: number;
    win_rate: number;
  };
  funnel: { stage: string; count: number }[];
  by_state: NV[];
  by_stage: NV[];
  by_source: NV[];
  by_owner: NV[];
  by_course: NV[];
  by_loss_reason: NV[];
  timeline: { month: string; leads: number }[];
  source_performance: {
    source: string;
    total: number;
    won: number;
    lost: number;
    in_progress: number;
    win_rate: number;
  }[];
  won_by_source: NV[];
  won_by_course: NV[];
};
const DATA = crmData as Data;

const fmtInt = (n: number) => new Intl.NumberFormat("pt-BR").format(Math.round(n));
const fmtPct = (n: number) => `${n.toFixed(2).replace(".", ",")}%`;
const fmtMonth = (m: string) => {
  const [y, mm] = m.split("-");
  const names = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${names[Number(mm) - 1]}/${y.slice(2)}`;
};

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border/50 bg-background/60 p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

function SimpleTable({
  title,
  rows,
  labelHead = "Item",
  valueHead = "Total",
}: {
  title: string;
  rows: NV[];
  labelHead?: string;
  valueHead?: string;
}) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div className="rounded-2xl border border-border/50 bg-card/60 p-4">
      <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">{title}</div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/40 text-left text-xs text-muted-foreground">
            <th className="py-2 pr-3 font-medium">{labelHead}</th>
            <th className="py-2 font-medium text-right">{valueHead}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} className="border-b border-border/20">
              <td className="py-2 pr-3">
                <div>{r.name}</div>
                <div className="mt-1 h-1 rounded bg-muted">
                  <div
                    className="h-1 rounded bg-primary/70"
                    style={{ width: `${(r.value / max) * 100}%` }}
                  />
                </div>
              </td>
              <td className="py-2 text-right tabular-nums">{fmtInt(r.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function UnorteCrmCsvPanel() {
  const funnelChart = useMemo(
    () =>
      DATA.funnel.map((s) => ({
        name: s.stage.length > 20 ? s.stage.slice(0, 20) + "…" : s.stage,
        count: s.count,
      })),
    []
  );

  const timelineChart = useMemo(
    () => DATA.timeline.map((t) => ({ name: fmtMonth(t.month), leads: t.leads })),
    []
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge className="bg-primary/10 text-primary hover:bg-primary/15">CRM · CSV</Badge>
        <span className="text-[11px] text-muted-foreground">
          Funil {DATA.meta.funnel_name} · {fmtInt(DATA.meta.total_leads)} negociações
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Total de leads" value={fmtInt(DATA.meta.total_leads)} />
        <Kpi label="Em andamento" value={fmtInt(DATA.meta.in_progress)} />
        <Kpi label="Ganhos (Vendida)" value={fmtInt(DATA.meta.won)} />
        <Kpi label="Perdidos" value={fmtInt(DATA.meta.lost)} />
        <Kpi
          label="Taxa de conversão"
          value={fmtPct(DATA.meta.win_rate)}
          sub="Vendida / total"
        />
        <Kpi
          label="Taxa vs. fechados"
          value={fmtPct(
            (DATA.meta.won / Math.max(DATA.meta.won + DATA.meta.lost, 1)) * 100
          )}
          sub="Vendida / (Vendida + Perdida)"
        />
        <Kpi
          label="Inscrições realizadas"
          value={fmtInt(DATA.by_stage.find((s) => s.name === "Inscrição Realizada")?.value ?? 0)}
        />
        <Kpi
          label="Matrículas pagas"
          value={fmtInt(DATA.by_stage.find((s) => s.name === "Matrícula Paga")?.value ?? 0)}
        />
      </div>

      <div className="rounded-2xl border border-border/50 bg-card/60 p-4">
        <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
          Funil de vendas
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={funnelChart} margin={{ top: 8, right: 8, left: 0, bottom: 50 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              angle={-20}
              textAnchor="end"
              interval={0}
              height={70}
            />
            <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
            <Tooltip
              formatter={(v: number) => [fmtInt(v), "Negociações"]}
              contentStyle={{
                background: "var(--background)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Bar dataKey="count" fill="var(--primary)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {timelineChart.length > 1 && (
        <div className="rounded-2xl border border-border/50 bg-card/60 p-4">
          <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
            Leads criados por mês
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={timelineChart} margin={{ top: 8, right: 8, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
              <Tooltip
                formatter={(v: number) => [fmtInt(v), "Leads"]}
                contentStyle={{
                  background: "var(--background)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="leads"
                stroke="var(--primary)"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="rounded-2xl border border-border/50 bg-card/60 p-4 overflow-x-auto">
        <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
          Desempenho por fonte
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/40 text-left text-xs text-muted-foreground">
              <th className="py-2 pr-3 font-medium">Fonte</th>
              <th className="py-2 pr-3 font-medium text-right">Total</th>
              <th className="py-2 pr-3 font-medium text-right">Em andamento</th>
              <th className="py-2 pr-3 font-medium text-right">Vendidos</th>
              <th className="py-2 pr-3 font-medium text-right">Perdidos</th>
              <th className="py-2 font-medium text-right">Win rate</th>
            </tr>
          </thead>
          <tbody>
            {DATA.source_performance.map((s) => (
              <tr key={s.source} className="border-b border-border/20">
                <td className="py-2 pr-3">{s.source}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{fmtInt(s.total)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{fmtInt(s.in_progress)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{fmtInt(s.won)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{fmtInt(s.lost)}</td>
                <td className="py-2 text-right tabular-nums">{fmtPct(s.win_rate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SimpleTable title="Top cursos de interesse" rows={DATA.by_course} labelHead="Curso" />
        <SimpleTable title="Responsáveis" rows={DATA.by_owner} labelHead="Responsável" />
        <SimpleTable
          title="Motivos de perda"
          rows={DATA.by_loss_reason}
          labelHead="Motivo"
        />
        <SimpleTable
          title="Vendas por curso"
          rows={DATA.won_by_course}
          labelHead="Curso"
          valueHead="Ganhos"
        />
      </div>
    </div>
  );
}

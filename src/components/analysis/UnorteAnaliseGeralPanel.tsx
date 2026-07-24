import { useMemo, useState } from "react";
import metaData from "@/data/unorte-meta-ads.json";
import gadsData from "@/data/unorte-google-ads.json";
import crmData from "@/data/unorte-crm.json";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Target,
  Lightbulb,
} from "lucide-react";

type MetaRow = {
  campaign: string;
  spend: number;
  impressions: number;
  reach: number;
  result_type?: string;
  results: number;
  clicks_all?: number;
  ctr?: number;
};
type GadsRow = {
  campaign: string;
  type: string;
  clicks: number;
  impressions: number;
  ctr: number;
  cpc: number;
  cost: number;
  conversions: number;
  cost_per_conv: number;
  conv_rate: number;
};
type Period<T> = { id: string; label: string; start: string; end: string; rows: T[] };
const META = metaData as { periods: Period<MetaRow>[] };
const GADS = gadsData as { periods: Period<GadsRow>[] };
const CRM = crmData as {
  meta: { total_leads: number; won: number; lost: number; in_progress: number; win_rate: number; funnel_name: string };
  funnel: { stage: string; count: number }[];
  by_source: { name: string; value: number }[];
  by_course: { name: string; value: number }[];
  by_loss_reason: { name: string; value: number }[];
  won_by_source: { name: string; value: number }[];
  won_by_course: { name: string; value: number }[];
  source_performance: {
    source: string;
    total: number;
    won: number;
    lost: number;
    in_progress: number;
    win_rate: number;
  }[];
  timeline: { month: string; leads: number }[];
};

const fmtInt = (n: number) => new Intl.NumberFormat("pt-BR").format(Math.round(n));
const fmtMoney = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n);
const fmtMoney2 = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 }).format(n);
const fmtPct = (n: number) => `${n.toFixed(2).replace(".", ",")}%`;

function Kpi({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "good" | "bad" | "warn";
}) {
  const toneClass =
    tone === "good"
      ? "border-[#8a6a3b]/40 bg-[#d8a15b]/10"
      : tone === "bad"
        ? "border-[#6c0e28]/40 bg-[#6c0e28]/10"
        : tone === "warn"
          ? "border-[#e73648]/40 bg-[#e73648]/10"
          : "border-border/50 bg-background/60";

  return (
    <div className={`rounded-xl border p-3 ${toneClass}`}>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/50 bg-card/60 p-4 md:p-5">
      <div className="mb-3">
        <div className="text-sm font-semibold">{title}</div>
        {subtitle && <div className="text-xs text-muted-foreground">{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}

function Insight({
  kind,
  title,
  body,
}: {
  kind: "good" | "bad" | "warn" | "idea";
  title: string;
  body: string;
}) {
  const conf = {
    good: { Icon: CheckCircle2, cls: "border-[#8a6a3b]/40 bg-[#d8a15b]/10 text-[#8a6a3b]" },
    bad: { Icon: AlertTriangle, cls: "border-[#6c0e28]/40 bg-[#6c0e28]/10 text-[#6c0e28]" },
    warn: { Icon: TrendingDown, cls: "border-[#e73648]/40 bg-[#e73648]/10 text-[#e73648]" },
    idea: { Icon: Lightbulb, cls: "border-[#a8324a]/40 bg-[#a8324a]/10 text-[#a8324a]" },
  }[kind];

  const { Icon, cls } = conf;
  return (
    <div className={`flex gap-3 rounded-xl border p-3 ${cls}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0">
        <div className="text-sm font-medium text-foreground">{title}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">{body}</div>
      </div>
    </div>
  );
}

// Paleta Marsala: vinho profundo, rosé quente, dourado suave, oliva e neutros terrosos
const CHART_COLORS = ["#6c0e28", "#a8324a", "#e73648", "#d8a15b", "#8a6a3b", "#4a2a2f"];


export function UnorteAnaliseGeralPanel() {
  // Align periods when possible; default to latest
  const [periodId, setPeriodId] = useState(META.periods[META.periods.length - 1].id);
  const [segment, setSegment] = useState<"all" | "grad" | "pos">("all");
  const metaPeriod = META.periods.find((p) => p.id === periodId) ?? META.periods[META.periods.length - 1];
  const gadsPeriod = GADS.periods.find((p) => p.id === periodId) ?? GADS.periods[GADS.periods.length - 1];

  const matchSegment = (name: string) => {
    if (segment === "all") return true;
    if (segment === "grad") return /grad/i.test(name);
    return /\bpos\b|pós|pos[-_ ]/i.test(name);
  };
  const metaRows = useMemo(() => metaPeriod.rows.filter((r) => matchSegment(r.campaign)), [metaPeriod, segment]);
  const gadsRows = useMemo(() => gadsPeriod.rows.filter((r) => matchSegment(r.campaign)), [gadsPeriod, segment]);

  const isLeadResult = (t?: string) => !!t && /lead|registro/i.test(t);
  const metaAgg = useMemo(() => {
    const rows = metaRows;
    const spend = rows.reduce((s, r) => s + (r.spend || 0), 0);
    const impressions = rows.reduce((s, r) => s + (r.impressions || 0), 0);
    const reach = rows.reduce((s, r) => s + (r.reach || 0), 0);
    const leadRows = rows.filter((r) => isLeadResult(r.result_type));
    const leads = leadRows.reduce((s, r) => s + (r.results || 0), 0);
    const leadSpend = leadRows.reduce((s, r) => s + (r.spend || 0), 0);
    const clicks = rows.reduce((s, r) => s + (r.clicks_all || 0), 0);
    const ctr = impressions > 0 && clicks > 0 ? (clicks / impressions) * 100 : 0;
    const cpl = leads > 0 ? leadSpend / leads : 0;
    return { spend, impressions, reach, leads, clicks, ctr, cpl };
  }, [metaRows]);

  const gadsAgg = useMemo(() => {
    const rows = gadsRows;
    const spend = rows.reduce((s, r) => s + (r.cost || 0), 0);
    const impressions = rows.reduce((s, r) => s + (r.impressions || 0), 0);
    const clicks = rows.reduce((s, r) => s + (r.clicks || 0), 0);
    // Conversões do Google Ads da Unorte = Leads
    const conv = rows.reduce((s, r) => s + (r.conversions || 0), 0);
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    const cpc = clicks > 0 ? spend / clicks : 0;
    const cpl = conv > 0 ? spend / conv : 0;
    return { spend, impressions, clicks, conv, ctr, cpc, cpl };
  }, [gadsRows]);

  const totalInvest = metaAgg.spend + gadsAgg.spend;
  const totalPaidLeads = metaAgg.leads + gadsAgg.conv;
  const blendedCpl = totalPaidLeads > 0 ? totalInvest / totalPaidLeads : 0;

  // Scope CRM to the selected period using its timeline (month "YYYY-MM").
  // The CRM snapshot is a single funnel — scale won/lost/in_progress/funnel/sources
  // proportionally by the share of leads that fall inside the period window.
  const crmScope = useMemo(() => {
    const start = metaPeriod.start.slice(0, 7); // YYYY-MM
    const endDate = new Date(metaPeriod.end);
    // period.end is exclusive-ish; use its month as upper bound (inclusive)
    const endMonth = `${endDate.getUTCFullYear()}-${String(endDate.getUTCMonth() + 1).padStart(2, "0")}`;
    const inRange = (m: string) => m >= start && m <= endMonth;
    const periodLeads = CRM.timeline.filter((t) => inRange(t.month)).reduce((s, t) => s + t.leads, 0);
    const totalLeads = CRM.meta.total_leads || 1;
    const ratio = Math.min(1, periodLeads / totalLeads);
    const scale = (n: number) => Math.round(n * ratio);
    return {
      ratio,
      periodLeads,
      total: periodLeads,
      won: scale(CRM.meta.won),
      lost: scale(CRM.meta.lost),
      inProgress: scale(CRM.meta.in_progress),
      winRate: periodLeads > 0 ? (scale(CRM.meta.won) / periodLeads) * 100 : 0,
    };
  }, [metaPeriod]);

  const crmAvailable = crmScope.periodLeads > 0;
  // Matrículas (CRM) = "Matrícula Paga" no funil, escalado ao período
  const pagaStageTotal = CRM.funnel.find((s) => s.stage === "Matrícula Paga")?.count ?? 0;
  const crmWon = Math.round(pagaStageTotal * crmScope.ratio);
  const crmTotal = crmScope.total;
  const cac = crmAvailable && crmWon > 0 ? totalInvest / crmWon : 0;
  const winRate = crmAvailable && crmScope.periodLeads > 0 ? (crmWon / crmScope.periodLeads) * 100 : 0;
  // Base pipeline data (não-escalado) — usado para diagnóstico de qualidade do CRM
  const openLeads = CRM.meta.in_progress;
  const decidedLeads = pagaStageTotal + CRM.meta.lost;
  const stalePct = CRM.meta.total_leads > 0 ? (openLeads / CRM.meta.total_leads) * 100 : 0;


  const investSplit = [
    { name: "Meta Ads", value: metaAgg.spend },
    { name: "Google Ads", value: gadsAgg.spend },
  ];
  const leadsSplit = [
    { name: "Meta Ads", value: metaAgg.leads },
    { name: "Google Ads", value: gadsAgg.conv },
  ];

  // CRM source performance (paid vs organic) — scaled to period
  const scaleN = (n: number) => Math.round(n * crmScope.ratio);
  const paidSources = CRM.source_performance.filter((s) => /Paga/i.test(s.source));
  const organicSources = CRM.source_performance.filter((s) => !/Paga/i.test(s.source));
  const paidAgg = paidSources.reduce(
    (a, s) => ({ total: a.total + scaleN(s.total), won: a.won + scaleN(s.won), lost: a.lost + scaleN(s.lost) }),
    { total: 0, won: 0, lost: 0 },
  );
  const organicAgg = organicSources.reduce(
    (a, s) => ({ total: a.total + scaleN(s.total), won: a.won + scaleN(s.won), lost: a.lost + scaleN(s.lost) }),
    { total: 0, won: 0, lost: 0 },
  );
  const paidWinRate = paidAgg.total > 0 ? (paidAgg.won / paidAgg.total) * 100 : 0;
  const organicWinRate = organicAgg.total > 0 ? (organicAgg.won / organicAgg.total) * 100 : 0;

  // Funnel conversion rates — scaled to period
  const funnelStages = CRM.funnel.map((f) => ({ ...f, count: scaleN(f.count) }));
  const leadStage = funnelStages.find((s) => s.stage === "Lead")?.count ?? 0;
  const inscricao = funnelStages.find((s) => s.stage === "Inscrição Realizada")?.count ?? 0;
  const deferido = funnelStages.find((s) => s.stage === "Deferido para matrícula")?.count ?? 0;
  const paga = funnelStages.find((s) => s.stage === "Matrícula Paga")?.count ?? 0;
  const matriculado = funnelStages.find((s) => s.stage === "Matriculado")?.count ?? 0;
  const totalFunnel = funnelStages.reduce((s, f) => s + f.count, 0);
  const insToPaid = inscricao > 0 ? (paga / inscricao) * 100 : 0;


  // Top / bottom performers
  const topMetaCampaigns = [...metaRows]
    .filter((r) => isLeadResult(r.result_type))
    .sort((a, b) => (b.results || 0) - (a.results || 0))
    .slice(0, 6)
    .map((r) => ({
      name: r.campaign.length > 28 ? r.campaign.slice(0, 28) + "…" : r.campaign,
      leads: r.results,
      cpl: r.results > 0 ? r.spend / r.results : 0,
    }));
  const worstMeta = [...metaRows]
    .filter((r) => isLeadResult(r.result_type) && r.spend > 500)
    .sort((a, b) => (b.spend / Math.max(b.results, 1)) - (a.spend / Math.max(a.results, 1)))
    .slice(0, 5);

  const topGadsCampaigns = [...gadsRows]
    .sort((a, b) => (b.conversions || 0) - (a.conversions || 0))
    .slice(0, 6)
    .map((r) => ({
      name: r.campaign.length > 28 ? r.campaign.slice(0, 28) + "…" : r.campaign,
      conv: r.conversions,
      cpl: r.cost_per_conv,
    }));

  // Timeline (CRM) — filtered by period
  const timelineChart = CRM.timeline
    .filter((t) => {
      const start = metaPeriod.start.slice(0, 7);
      const endDate = new Date(metaPeriod.end);
      const endMonth = `${endDate.getUTCFullYear()}-${String(endDate.getUTCMonth() + 1).padStart(2, "0")}`;
      return t.month >= start && t.month <= endMonth;
    })
    .map((t) => {
      const [y, mm] = t.month.split("-");
      const names = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
      return { name: `${names[Number(mm) - 1]}/${y.slice(2)}`, leads: t.leads };
    });


  // Loss reasons top
  const topLossReasons = CRM.by_loss_reason.slice(0, 6);

  // Course opportunity: high interest but low conversion
  const courseInterest = new Map(CRM.by_course.map((c) => [c.name, c.value]));
  const courseWon = new Map(CRM.won_by_course.map((c) => [c.name, c.value]));
  const courseOpp = [...courseInterest.entries()]
    .filter(([n]) => n !== "—")
    .map(([name, interest]) => {
      const w = courseWon.get(name) ?? 0;
      const rate = interest > 0 ? (w / interest) * 100 : 0;
      return { name, interest, won: w, rate };
    })
    .sort((a, b) => b.interest - a.interest)
    .slice(0, 8);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge className="bg-primary/10 text-primary hover:bg-primary/15">Análise Geral</Badge>
          <span className="text-[11px] text-muted-foreground">
            Consolidado Meta Ads + Google Ads + CRM · Nível C-Level
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={periodId} onValueChange={setPeriodId}>
            <SelectTrigger className="h-8 w-[220px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {META.periods.map((p) => (
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
        </div>
      </div>

      {/* Executive summary */}
      <Section
        title="Sumário Executivo"
        subtitle={
          crmAvailable
            ? `Período de mídia: ${metaPeriod.label} · CRM: Funil ${CRM.meta.funnel_name}`
            : `Período de mídia: ${metaPeriod.label} · CRM sem dados neste período (funil ${CRM.meta.funnel_name} iniciou em jul/2025)`
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi label="Investimento total" value={fmtMoney(totalInvest)} sub={`${fmtMoney(metaAgg.spend)} Meta · ${fmtMoney(gadsAgg.spend)} Google`} />
          <Kpi label="Leads pagos gerados" value={fmtInt(totalPaidLeads)} sub={`CPL médio ${fmtMoney2(blendedCpl)}`} />
          <Kpi
            label="Matrículas (CRM)"
            value={crmAvailable ? fmtInt(crmWon) : "—"}
            sub={crmAvailable ? `Base ${fmtInt(crmTotal)} leads` : "Sem dados no período"}
          />
          <Kpi
            label="CAC estimado"
            value={crmAvailable && crmWon > 0 ? fmtMoney(cac) : "—"}
            sub={crmAvailable ? "Investimento total / matrículas" : "CRM indisponível"}
            tone={crmAvailable && cac > 500 ? "warn" : "good"}
          />
          <Kpi
            label="Win rate CRM"
            value={crmAvailable ? fmtPct(winRate) : "—"}
            tone={crmAvailable && winRate < 10 ? "warn" : "good"}
            sub={crmAvailable ? undefined : "Sem base"}
          />
          <Kpi
            label="Inscrição → Matrícula Paga"
            value={crmAvailable ? fmtPct(insToPaid) : "—"}
            sub={crmAvailable ? `${fmtInt(paga)} de ${fmtInt(inscricao)}` : "Sem base"}
          />
          <Kpi label="Em andamento" value={crmAvailable ? fmtInt(crmScope.inProgress) : "—"} sub="Pipeline aberto" />
          <Kpi label="Perdidos" value={crmAvailable ? fmtInt(crmScope.lost) : "—"} tone="bad" />
        </div>
      </Section>

      {/* Insights consultoria */}
      <div className="grid gap-3 md:grid-cols-2">
        {!crmAvailable && (
          <Insight
            kind="bad"
            title="CRM não cobre este período — análise limitada à mídia paga"
            body={`O funil ${CRM.meta.funnel_name} começou a receber leads em jul/2025. Para ${metaPeriod.label}, não há histórico de matrículas/win rate — CAC e conversão CRM estão indisponíveis. Considere importar o funil de graduação anterior para comparar ciclos.`}
          />
        )}
        <Insight
          kind="bad"
          title={`Higiene do CRM crítica: ${fmtInt(openLeads)} leads em aberto (${fmtPct(stalePct)} da base)`}
          body={`Apenas ${fmtInt(decidedLeads)} negociações foram resolvidas (ganhas ou perdidas). O excesso de "em andamento" sem atualização inflaciona o pipeline, distorce win rate e mascara o CAC real. Rodar limpeza: reclassificar leads sem interação há 30 dias como perdidos, aplicar SLA de follow-up e reprocessar métricas.`}
        />
        {crmAvailable && (
          <Insight
            kind={paidWinRate < organicWinRate ? "warn" : "good"}
            title={`Qualidade: leads pagos convertem ${fmtPct(paidWinRate)} vs. orgânicos ${fmtPct(organicWinRate)}`}
            body={
              paidWinRate < organicWinRate
                ? "Atenção: com CRM enviesado por leads em aberto, o win rate real de ambos os canais deve ser maior. Ainda assim, orgânicos/diretos convertem melhor — reforce SEO, referências e remarketing para reduzir CAC."
                : "Mídia paga performa acima do orgânico — pode escalar investimento com atenção ao CPL. Revisitar após saneamento do CRM."
            }
          />
        )}
        <Insight
          kind={gadsAgg.cpl < metaAgg.cpl ? "good" : "warn"}
          title={`Google Ads CPL ${fmtMoney2(gadsAgg.cpl)} vs. Meta CPL ${fmtMoney2(metaAgg.cpl)}`}
          body={
            gadsAgg.cpl < metaAgg.cpl
              ? "Google captura demanda pronta com CPL menor. Considere realocar parte do budget de topo do Meta para Search/Performance Max."
              : "Meta está mais eficiente na geração de leads que Google. Revise palavras-chave, correspondência e páginas de destino do Search."
          }
        />
        {crmAvailable && (
          <Insight
            kind="idea"
            title="Cursos com alta demanda e baixa conversão são a maior alavanca"
            body="Veterinária, Estética Semipresencial e Psicologia concentram interesse mas convertem abaixo da média — parcialmente explicado pelo backlog de leads em aberto. Landing pages e ofertas dedicadas + saneamento do funil podem destravar receita."
          />
        )}
      </div>


      {/* Investment vs Leads */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Investimento por canal" subtitle="Distribuição de mídia paga">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={investSplit} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                {investSplit.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => fmtMoney(v)} contentStyle={{ background: "var(--background)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg border border-border/40 p-2">
              <div className="text-muted-foreground">Meta CTR</div>
              <div className="font-semibold tabular-nums">{fmtPct(metaAgg.ctr)}</div>
            </div>
            <div className="rounded-lg border border-border/40 p-2">
              <div className="text-muted-foreground">Google CTR</div>
              <div className="font-semibold tabular-nums">{fmtPct(gadsAgg.ctr)}</div>
            </div>
          </div>
        </Section>

        <Section title="Leads/Conversões por canal" subtitle="Volume comparativo">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={leadsSplit} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                {leadsSplit.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[(i + 1) % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => fmtInt(v)} contentStyle={{ background: "var(--background)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg border border-border/40 p-2">
              <div className="text-muted-foreground">Meta CPL</div>
              <div className="font-semibold tabular-nums">{fmtMoney2(metaAgg.cpl)}</div>
            </div>
            <div className="rounded-lg border border-border/40 p-2">
              <div className="text-muted-foreground">Google CPL</div>
              <div className="font-semibold tabular-nums">{fmtMoney2(gadsAgg.cpl)}</div>
            </div>
          </div>
        </Section>
      </div>

      {/* Funnel */}
      <Section title="Funil de captação → matrícula" subtitle={`${fmtInt(totalFunnel)} negociações no funil ${CRM.meta.funnel_name}`}>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={funnelStages.map((s) => ({ name: s.stage, count: s.count }))} margin={{ top: 8, right: 8, left: 0, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} angle={-20} textAnchor="end" interval={0} height={60} />
            <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
            <Tooltip formatter={(v: number) => fmtInt(v)} contentStyle={{ background: "var(--background)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="count" fill="var(--primary)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-3 grid gap-2 sm:grid-cols-4">
          <Kpi label="Inscrição realizada" value={fmtInt(inscricao)} />
          <Kpi label="Deferido p/ matrícula" value={fmtInt(deferido)} />
          <Kpi label="Matrícula paga" value={fmtInt(paga)} tone="good" />
          <Kpi label="Matriculado" value={fmtInt(matriculado)} tone="good" />
        </div>
      </Section>

      {/* Timeline */}
      <Section title="Leads criados por mês" subtitle="Sazonalidade da captação">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={timelineChart} margin={{ top: 8, right: 8, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
            <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
            <Tooltip formatter={(v: number) => [fmtInt(v), "Leads"]} contentStyle={{ background: "var(--background)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
            <Line type="monotone" dataKey="leads" stroke="var(--primary)" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </Section>

      {/* Top performers */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Meta · Top campanhas por leads" subtitle="Onde a mídia paga entrega volume">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={topMetaCampaigns} layout="vertical" margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
              <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
              <Tooltip contentStyle={{ background: "var(--background)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="leads" fill="var(--primary)" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Section>

        <Section title="Google · Top campanhas por leads" subtitle="Conversões = Leads · demanda de fundo de funil">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={topGadsCampaigns} layout="vertical" margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
              <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
              <Tooltip contentStyle={{ background: "var(--background)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="conv" fill="#22c55e" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Section>
      </div>

      {/* Cost drag */}
      <Section title="Meta · Campanhas com maior CPL (drag do budget)" subtitle="Investimento >R$500 ordenado por custo por resultado">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40 text-left text-xs text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Campanha</th>
                <th className="py-2 pr-3 font-medium text-right">Investido</th>
                <th className="py-2 pr-3 font-medium text-right">Leads</th>
                <th className="py-2 font-medium text-right">CPL</th>
              </tr>
            </thead>
            <tbody>
              {worstMeta.map((r) => {
                const cpl = r.results > 0 ? r.spend / r.results : 0;
                return (
                  <tr key={r.campaign} className="border-b border-border/20">
                    <td className="py-2 pr-3">{r.campaign}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{fmtMoney2(r.spend)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{fmtInt(r.results)}</td>
                    <td className="py-2 text-right tabular-nums text-[#6c0e28]">{fmtMoney2(cpl)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Course opportunities */}
      <Section title="Oportunidades por curso" subtitle="Interesse vs. matrícula paga — onde há gap para destravar">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40 text-left text-xs text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Curso</th>
                <th className="py-2 pr-3 font-medium text-right">Interesse</th>
                <th className="py-2 pr-3 font-medium text-right">Ganhos</th>
                <th className="py-2 font-medium text-right">Conversão</th>
              </tr>
            </thead>
            <tbody>
              {courseOpp.map((c) => (
                <tr key={c.name} className="border-b border-border/20">
                  <td className="py-2 pr-3">{c.name}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{fmtInt(c.interest)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{fmtInt(c.won)}</td>
                  <td
                    className={`py-2 text-right tabular-nums ${
                      c.rate < 3 ? "text-[#6c0e28]" : c.rate > 10 ? "text-[#8a6a3b]" : "text-[#e73648]"
                    }`}
                  >
                    {fmtPct(c.rate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Loss reasons */}
      <Section title="Principais motivos de perda" subtitle="Onde o funil está vazando">
        <div className="grid gap-2 md:grid-cols-2">
          {topLossReasons.map((r) => (
            <div key={r.name} className="flex items-center justify-between rounded-lg border border-border/40 p-3">
              <span className="text-sm">{r.name}</span>
              <span className="text-sm font-semibold tabular-nums text-[#6c0e28]">{fmtInt(r.value)}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Consultoria: Recomendações */}
      <Section title="Recomendações estratégicas · Board" subtitle="Prioridades acionáveis nas próximas 4–6 semanas">
        <div className="grid gap-3 md:grid-cols-2">
          <Insight
            kind="idea"
            title="1. Redirecionar budget para fundo de funil"
            body={`Google (CPL ${fmtMoney2(gadsAgg.cpl)}) e remarketing devem crescer. Realocar de 15–20% de campanhas de reach do Meta com CPL acima da mediana.`}
          />
          <Insight
            kind="bad"
            title="2. Saneamento do CRM (prioridade zero)"
            body={`${fmtInt(openLeads)} leads em aberto vs. apenas ${fmtInt(decidedLeads)} resolvidos — ${fmtPct(stalePct)} da base sem desfecho. Antes de qualquer decisão de mídia, aplicar limpeza: reclassificar sem interação há 30 dias, exigir motivo de perda e SLA <5min. Sem isso, win rate e CAC seguem distorcidos.`}
          />

          <Insight
            kind="idea"
            title="3. Higienização de base"
            body="Contatos duplicados, número errado e curso inexistente somam 1/3 das perdas. Adicionar validação nos formulários e detecção de duplicidade reduz CAC diretamente."
          />
          <Insight
            kind="idea"
            title="4. SEO + Referências"
            body={`Orgânico converte ${fmtPct(organicWinRate)} vs. ${fmtPct(paidWinRate)} pago. Investir em conteúdo por curso (Veterinária, Odontologia, Psicologia) e programa de indicação de alunos.`}
          />
          <Insight
            kind="idea"
            title="5. Landing pages por curso"
            body="Curso 'não identificado' concentra maior volume (5.436) e menor qualidade. Roteamento por curso na LP e ADV+ com criativos por vertical devem elevar taxa Lead→Inscrição."
          />
          <Insight
            kind="idea"
            title="6. Análise de coorte por safra"
            body="Cruzar mês de captação × conversão para identificar CAC blended por safra e antecipar contratação de banca comercial nos picos (Out–Jan)."
          />
        </div>
      </Section>
    </div>
  );
}

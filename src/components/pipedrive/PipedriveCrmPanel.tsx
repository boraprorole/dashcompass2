import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { format } from "date-fns";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Briefcase,
  Loader2,
  TrendingUp,
  Trophy,
  Target,
  Users,
  ExternalLink,
  DollarSign,
  Percent,
} from "lucide-react";
import { getPipedriveCrmMetrics } from "@/lib/pipedrive.functions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PRESETS: Array<{ id: string; label: string }> = [
  { id: "last_7d", label: "Últimos 7 dias" },
  { id: "last_30d", label: "Últimos 30 dias" },
  { id: "last_90d", label: "Últimos 90 dias" },
  { id: "last_180d", label: "Últimos 180 dias" },
  { id: "last_12m", label: "Últimos 12 meses" },
  { id: "this_month", label: "Este mês" },
  { id: "last_month", label: "Mês passado" },
];

function presetToRange(preset: string): { dateFrom: string; dateTo: string } {
  const now = new Date();
  const to = now;
  let from = new Date();
  switch (preset) {
    case "last_7d":
      from = new Date(now.getTime() - 7 * 86400000);
      break;
    case "last_90d":
      from = new Date(now.getTime() - 90 * 86400000);
      break;
    case "last_180d":
      from = new Date(now.getTime() - 180 * 86400000);
      break;
    case "last_12m":
      from = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      break;
    case "this_month":
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "last_month": {
      const f = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const t = new Date(now.getFullYear(), now.getMonth(), 0);
      return { dateFrom: format(f, "yyyy-MM-dd"), dateTo: format(t, "yyyy-MM-dd") };
    }
    case "last_30d":
    default:
      from = new Date(now.getTime() - 30 * 86400000);
  }
  return { dateFrom: format(from, "yyyy-MM-dd"), dateTo: format(to, "yyyy-MM-dd") };
}

function money(v: number, currency = "BRL") {
  try {
    return v.toLocaleString("pt-BR", {
      style: "currency",
      currency: currency || "BRL",
      maximumFractionDigits: 0,
    });
  } catch {
    return `R$ ${Math.round(v).toLocaleString("pt-BR")}`;
  }
}
function compact(v: number) {
  return new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(v);
}
function pct(v: number | null) {
  if (v == null) return "—";
  return `${(v * 100).toFixed(1)}%`;
}

export function PipedriveCrmPanel({ reportId }: { reportId: string }) {
  const [preset, setPreset] = useState("last_30d");
  const { dateFrom, dateTo } = useMemo(() => presetToRange(preset), [preset]);
  const fetchCrm = useServerFn(getPipedriveCrmMetrics);

  const q = useQuery({
    queryKey: ["pipedrive-crm", reportId, preset],
    queryFn: () => fetchCrm({ data: { reportId, dateFrom, dateTo } }),
    retry: false,
  });

  if (q.isLoading) {
    return (
      <div className="glass-strong flex items-center justify-center rounded-3xl p-6 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando CRM...
      </div>
    );
  }
  if (q.error) {
    return (
      <div className="glass-strong rounded-3xl p-6 text-sm text-destructive">
        Erro ao carregar Pipedrive: {(q.error as Error).message}
      </div>
    );
  }
  if (!q.data || q.data.connected === false) return null;

  const { kpis, trend, topOpen, funnel, byOwner, currency, pdUserName, adsLeadStats } = q.data;

  return (
    <div className="glass-strong space-y-5 rounded-3xl p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="rounded-xl bg-primary/10 p-2 text-primary">
            <Briefcase className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold leading-tight">CRM · Diretoria</h2>
            <p className="text-[11px] text-muted-foreground">
              Pipedrive{pdUserName ? ` · ${pdUserName}` : ""} · funil, receita e conversão
            </p>
          </div>
        </div>
        <Select value={preset} onValueChange={setPreset}>
          <SelectTrigger className="h-9 w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRESETS.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPIs executivos */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi
          icon={<Trophy className="h-3.5 w-3.5" />}
          label="Receita ganha"
          value={money(kpis.wonValue, currency)}
          sub={`${kpis.wonCount} deals fechados`}
          tone="emerald"
        />
        <Kpi
          icon={<Percent className="h-3.5 w-3.5" />}
          label="Taxa de conversão"
          value={pct(kpis.winRate)}
          sub={`${kpis.wonCount} ganhos · ${kpis.lostCount} perdidos`}
          tone="primary"
        />
        <Kpi
          icon={<DollarSign className="h-3.5 w-3.5" />}
          label="Ticket médio"
          value={money(kpis.avgTicket, currency)}
          sub={`Base: ${kpis.wonCount} deals`}
        />
        <Kpi
          icon={<Target className="h-3.5 w-3.5" />}
          label="Pipeline aberto"
          value={money(kpis.openValue, currency)}
          sub={`${kpis.openCount} deals · ponderado ${money(kpis.weightedOpenValue, currency)}`}
        />
        <Kpi
          icon={<TrendingUp className="h-3.5 w-3.5" />}
          label="Novos deals"
          value={compact(kpis.newDealsCount)}
          sub={money(kpis.newDealsValue, currency)}
        />
        <Kpi
          icon={<Trophy className="h-3.5 w-3.5" />}
          label="Deals perdidos"
          value={compact(kpis.lostCount)}
          sub={money(kpis.lostValue, currency)}
          tone="rose"
        />
        <Kpi
          icon={<Users className="h-3.5 w-3.5" />}
          label="Vendedores ativos"
          value={String(byOwner.length)}
          sub={byOwner[0]?.owner ? `Top: ${byOwner[0].owner}` : "—"}
        />
        <Kpi
          icon={<Target className="h-3.5 w-3.5" />}
          label="Etapas no funil"
          value={String(funnel.length)}
          sub={funnel[0]?.stage ? `Maior: ${funnel[0].stage}` : "—"}
        />
      </div>

      {/* Qualidade de Leads (Ads × CRM) */}
      {adsLeadStats?.hasAds && (
        <LeadQualityBlock
          ads={adsLeadStats}
          crmNewDeals={kpis.newDealsCount}
          crmWonCount={kpis.wonCount}
          crmWonValue={kpis.wonValue}
          currency={currency}
        />
      )}

      {/* Trend */}
      {trend.length > 0 && (
        <div className="rounded-2xl border border-border/30 bg-background/30 p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Evolução — novos vs. ganhos vs. perdidos</h3>
            <span className="text-[11px] text-muted-foreground">
              {trend.length} pontos · {currency || "moeda base"}
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer>
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="pdWon" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeOpacity={0.1} vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="won" name="Ganhos" stroke="hsl(var(--primary))" fill="url(#pdWon)" strokeWidth={2} />
                <Area type="monotone" dataKey="added" name="Novos" stroke="#38bdf8" fill="transparent" strokeWidth={2} />
                <Area type="monotone" dataKey="lost" name="Perdidos" stroke="#f43f5e" fill="transparent" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Funil por etapa */}
        {funnel.length > 0 && (
          <div className="rounded-2xl border border-border/30 bg-background/30 p-4">
            <h3 className="mb-3 text-sm font-semibold">Funil aberto por etapa</h3>
            <div className="h-72 w-full">
              <ResponsiveContainer>
                <BarChart data={funnel} layout="vertical" margin={{ left: 16 }}>
                  <CartesianGrid strokeOpacity={0.1} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => compact(Number(v))} />
                  <YAxis
                    type="category"
                    dataKey="stage"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={120}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                    formatter={(v: number, k) =>
                      k === "value" ? money(Number(v), currency) : String(v)
                    }
                  />
                  <Bar dataKey="value" name="Valor" radius={[0, 6, 6, 0]}>
                    {funnel.map((_, i) => (
                      <Cell key={i} fill={`hsl(${210 + i * 10} 80% 55%)`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Ranking por vendedor */}
        {byOwner.length > 0 && (
          <div className="rounded-2xl border border-border/30 bg-background/30 p-4">
            <h3 className="mb-3 text-sm font-semibold">Ranking por vendedor (ganhos no período)</h3>
            <ul className="divide-y divide-border/40">
              {byOwner.map((o, i) => (
                <li key={o.owner} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                      {i + 1}
                    </span>
                    <span className="font-medium">{o.owner}</span>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    <span className="text-[11px] text-muted-foreground">{o.wonCount} deals</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {money(o.wonValue, currency)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Top open deals */}
      {topOpen.length > 0 && (
        <div className="rounded-2xl border border-border/30 bg-background/30 p-4">
          <h3 className="mb-3 text-sm font-semibold">Top oportunidades abertas</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="pb-2 pr-3">Deal</th>
                  <th className="pb-2 pr-3">Etapa</th>
                  <th className="pb-2 pr-3">Responsável</th>
                  <th className="pb-2 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {topOpen.map((d) => (
                  <tr key={d.id}>
                    <td className="py-2 pr-3 font-medium">
                      <span className="inline-flex items-center gap-1">
                        {d.title}
                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-muted-foreground">{d.stage}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{d.owner}</td>
                    <td className="py-2 text-right font-semibold">{money(d.value, d.currency || currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  tone?: "primary" | "emerald" | "rose";
}) {
  const toneClass =
    tone === "emerald"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "rose"
        ? "text-rose-600 dark:text-rose-400"
        : tone === "primary"
          ? "text-primary"
          : "text-foreground";
  return (
    <div className="rounded-2xl border border-border/30 bg-background/40 p-3">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <span className={toneClass}>{icon}</span> {label}
      </div>
      <div className={`mt-1 text-lg font-semibold ${toneClass}`}>{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

function LeadQualityBlock({
  ads,
  crmNewDeals,
  crmWonCount,
  crmWonValue,
  currency,
}: {
  ads: {
    hasAds: boolean;
    leads: number;
    spend: number;
    currency: string;
    sources: Array<{ label: string; leads: number; spend: number }>;
  };
  crmNewDeals: number;
  crmWonCount: number;
  crmWonValue: number;
  currency: string;
}) {
  const cur = currency || ads.currency || "BRL";
  const leadToDeal = ads.leads > 0 ? crmNewDeals / ads.leads : null;
  const leadToWon = ads.leads > 0 ? crmWonCount / ads.leads : null;
  const cpl = ads.leads > 0 ? ads.spend / ads.leads : null;
  const cpDeal = crmNewDeals > 0 ? ads.spend / crmNewDeals : null;
  const cpWon = crmWonCount > 0 ? ads.spend / crmWonCount : null;
  const roas = ads.spend > 0 ? crmWonValue / ads.spend : null;

  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/[0.03] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Qualidade de Leads · Ads × CRM</h3>
          <p className="text-[11px] text-muted-foreground">
            Cruzamento por janela temporal — {ads.sources.map((s) => s.label).join(", ")}
          </p>
        </div>
        <div className="text-right text-[11px] text-muted-foreground">
          <div>{ads.leads.toLocaleString("pt-BR")} leads · {money(ads.spend, cur)} investidos</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi
          icon={<Percent className="h-3.5 w-3.5" />}
          label="Lead → Deal criado"
          value={pct(leadToDeal)}
          sub={`${crmNewDeals} deals / ${ads.leads} leads`}
          tone="primary"
        />
        <Kpi
          icon={<Trophy className="h-3.5 w-3.5" />}
          label="Lead → Ganho"
          value={pct(leadToWon)}
          sub={`${crmWonCount} ganhos / ${ads.leads} leads`}
          tone="emerald"
        />
        <Kpi
          icon={<DollarSign className="h-3.5 w-3.5" />}
          label="CPL declarado (Ads)"
          value={cpl != null ? money(cpl, cur) : "—"}
          sub={`${money(ads.spend, cur)} / ${ads.leads} leads`}
        />
        <Kpi
          icon={<DollarSign className="h-3.5 w-3.5" />}
          label="Custo por deal criado"
          value={cpDeal != null ? money(cpDeal, cur) : "—"}
          sub={crmNewDeals > 0 ? `${crmNewDeals} deals no CRM` : "Sem deals novos"}
          tone="primary"
        />
        <Kpi
          icon={<Trophy className="h-3.5 w-3.5" />}
          label="Custo por deal ganho (CAC)"
          value={cpWon != null ? money(cpWon, cur) : "—"}
          sub={crmWonCount > 0 ? `${crmWonCount} ganhos no CRM` : "Sem ganhos"}
          tone="emerald"
        />
        <Kpi
          icon={<TrendingUp className="h-3.5 w-3.5" />}
          label="ROAS de CRM"
          value={roas != null ? `${roas.toFixed(2)}x` : "—"}
          sub={`${money(crmWonValue, cur)} / ${money(ads.spend, cur)}`}
          tone={roas != null && roas >= 1 ? "emerald" : "rose"}
        />
        <Kpi
          icon={<Users className="h-3.5 w-3.5" />}
          label="Leads sem virar deal"
          value={compact(Math.max(0, ads.leads - crmNewDeals))}
          sub={
            ads.leads > 0
              ? `${(((ads.leads - crmNewDeals) / ads.leads) * 100).toFixed(1)}% do topo`
              : "—"
          }
          tone="rose"
        />
        <Kpi
          icon={<Target className="h-3.5 w-3.5" />}
          label="Fontes de mídia"
          value={String(ads.sources.length)}
          sub={ads.sources[0]?.label ?? "—"}
        />
      </div>

      <p className="mt-3 text-[10.5px] leading-relaxed text-muted-foreground">
        Atribuição por <b>janela temporal</b>: compara leads e investimento em mídia paga
        com deals criados/ganhos no mesmo período. Não separa por campanha —
        para atribuição por campanha, é preciso enviar UTM para o Pipedrive
        (ex: <code>utm_source=facebook</code>) via integração de formulário.
      </p>
    </div>
  );
}

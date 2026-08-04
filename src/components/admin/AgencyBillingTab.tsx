import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Loader2,
  CalendarClock,
  Building2,
  Plug,
  Users,
  FileText,
  CreditCard,
  ArrowUpRight,
  CheckCircle2,
} from "lucide-react";
import { getAgencyBilling } from "@/lib/billing.functions";
import { openMyCustomerPortal } from "@/lib/subscriptions.functions";

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  active: { label: "Ativa", className: "bg-primary/15 text-primary" },
  trialing: { label: "Em trial", className: "bg-sky-500/15 text-sky-400" },
  past_due: { label: "Pagamento pendente", className: "bg-amber-500/15 text-amber-400" },
  canceled: { label: "Cancelada", className: "bg-destructive/15 text-destructive" },
  unpaid: { label: "Não paga", className: "bg-destructive/15 text-destructive" },
  none: { label: "Sem assinatura", className: "bg-muted text-muted-foreground" },
};

function fmtDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR");
}

function fmtBRL(value?: number | null) {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(value),
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function AgencyBillingTab() {
  const fetchBilling = useServerFn(getAgencyBilling);
  const portalFn = useServerFn(openMyCustomerPortal);

  const { data, isLoading, error } = useQuery({
    queryKey: ["agency-billing"],
    queryFn: () => fetchBilling(),
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando dados financeiros...
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass rounded-2xl p-6 text-sm text-destructive">
        Não foi possível carregar o financeiro: {(error as Error).message}
      </div>
    );
  }

  const sub = data?.subscription ?? null;
  const status = sub?.status ?? "none";
  const badge = STATUS_LABEL[status] ?? {
    label: status,
    className: "bg-muted text-muted-foreground",
  };
  const usage = data?.usage;
  const activeConnectors = (usage?.connections ?? []).filter((c) => c.count > 0);

  const openPortal = async () => {
    const result = (await portalFn({
      data: { returnUrl: window.location.origin + "/admin" },
    })) as { url?: string; error?: string };
    if (result.error || !result.url) {
      toast.error(result.error ?? "Portal de pagamento indisponível.");
      return;
    }
    window.open(result.url, "_blank");
  };

  return (
    <div className="space-y-8">
      {/* Plano atual */}
      <section className="glass rounded-2xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Plano atual
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-semibold tracking-tight">
                {sub?.plan_label ?? sub?.price_id ?? "Nenhum plano ativo"}
              </h2>
              <span
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider",
                  badge.className,
                )}
              >
                {badge.label}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <CalendarClock className="h-4 w-4" />
                Renovação: <strong className="text-foreground">{fmtDate(data?.effectiveEnd)}</strong>
              </span>
              {data?.daysLeft !== null && data?.daysLeft !== undefined && (
                <span>
                  {data.daysLeft >= 0
                    ? `${data.daysLeft} dia(s) restante(s)`
                    : `Expirada há ${Math.abs(data.daysLeft)} dia(s)`}
                </span>
              )}
              {sub?.cancel_at_period_end && (
                <Badge variant="outline" className="text-amber-400">
                  Cancela no fim do período
                </Badge>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {data?.hasStripeCustomer && (
              <Button variant="outline" onClick={openPortal}>
                <CreditCard className="mr-2 h-4 w-4" /> Gerenciar pagamento
              </Button>
            )}
            <Button asChild>
              <a href="/#pricing">
                <ArrowUpRight className="mr-2 h-4 w-4" /> Fazer upgrade
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Uso */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={Building2}
          label="Empresas criadas"
          value={usage?.companies ?? 0}
          hint="Clientes cadastrados na agência"
        />
        <MetricCard
          icon={FileText}
          label="Relatórios"
          value={usage?.reports ?? 0}
          hint="Dashboards publicados"
        />
        <MetricCard
          icon={Plug}
          label="Contas integradas"
          value={usage?.connectionsTotal ?? 0}
          hint={`${activeConnectors.length} conector(es) em uso`}
        />
        <MetricCard
          icon={Users}
          label="Usuários vinculados"
          value={usage?.users ?? 0}
          hint="Equipe e clientes com acesso"
        />
      </section>

      {/* Integrações detalhadas */}
      <section className="glass rounded-2xl p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Integrações por conector
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {(usage?.connections ?? []).map((c) => (
            <div
              key={c.label}
              className={cn(
                "flex items-center justify-between rounded-xl border border-border/40 px-4 py-3 text-sm",
                c.count > 0 ? "bg-primary/5" : "opacity-60",
              )}
            >
              <span>{c.label}</span>
              <span className="font-semibold">{c.count}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Planos disponíveis */}
      {data?.plans && data.plans.length > 0 && (
        <section>
          <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Planos disponíveis
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            {data.plans.map((plan) => {
              const isCurrent =
                sub?.plan_label === plan.label || sub?.price_id === plan.key;
              return (
                <div
                  key={plan.key}
                  className={cn(
                    "glass flex flex-col rounded-2xl p-6",
                    isCurrent && "ring-1 ring-primary",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">{plan.label}</h3>
                    {isCurrent && (
                      <Badge className="bg-primary/15 text-primary">Atual</Badge>
                    )}
                  </div>
                  <p className="mt-2 text-3xl font-semibold tracking-tight">
                    {fmtBRL(plan.value_brl)}
                    <span className="text-sm font-normal text-muted-foreground">/mês</span>
                  </p>
                  {plan.description && (
                    <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
                  )}
                  <ul className="mt-4 space-y-2 text-sm">
                    {(plan.features_pt ?? []).map((f: string) => (
                      <li key={f} className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span className="text-muted-foreground">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto pt-5">
                    <Button
                      className="w-full"
                      variant={isCurrent ? "outline" : "default"}
                      disabled={isCurrent}
                      onClick={() => {
                        if (data?.hasStripeCustomer) void openPortal();
                        else window.location.href = "/#pricing";
                      }}
                    >
                      {isCurrent ? "Plano atual" : "Fazer upgrade"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

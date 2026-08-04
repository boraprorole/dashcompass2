import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, RefreshCw, Gift, CreditCard, Ban, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getUserSubscription,
  grantTrial,
  openCustomerPortalAdmin,
  setSubscriptionAccess,
  setSubscriptionExpiration,
  syncSubscriptionWithStripe,
} from "@/lib/subscriptions.functions";

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-primary/15 text-primary" },
  trialing: { label: "Trial", className: "bg-sky-500/15 text-sky-400" },
  past_due: { label: "Past Due", className: "bg-amber-500/15 text-amber-400" },
  canceled: { label: "Canceled", className: "bg-destructive/15 text-destructive" },
  unpaid: { label: "Unpaid", className: "bg-destructive/15 text-destructive" },
  incomplete: { label: "Incomplete", className: "bg-muted text-muted-foreground" },
  incomplete_expired: { label: "Expired", className: "bg-destructive/15 text-destructive" },
  none: { label: "Sem assinatura", className: "bg-muted text-muted-foreground" },
};

function fmt(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("pt-BR");
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/40 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="max-w-[60%] break-all text-right font-medium">{value}</span>
    </div>
  );
}

export interface SubscriptionDialogProps {
  userId: string;
  userEmail: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SubscriptionDialog({
  userId,
  userEmail,
  open,
  onOpenChange,
}: SubscriptionDialogProps) {
  const qc = useQueryClient();
  const fetchSub = useServerFn(getUserSubscription);
  const syncFn = useServerFn(syncSubscriptionWithStripe);
  const trialFn = useServerFn(grantTrial);
  const expFn = useServerFn(setSubscriptionExpiration);
  const accessFn = useServerFn(setSubscriptionAccess);
  const portalFn = useServerFn(openCustomerPortalAdmin);

  const [trialDays, setTrialDays] = useState("14");
  const [customDate, setCustomDate] = useState("");

  const queryKey = ["admin-subscription", userId];
  const { data, isLoading } = useQuery({
    queryKey,
    enabled: open,
    queryFn: () => fetchSub({ data: { userId } }),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey });
    qc.invalidateQueries({ queryKey: ["subscription-access"] });
  };

  const run = useMutation({
    mutationFn: async (action: () => Promise<{ error?: string } | unknown>) => {
      const result = (await action()) as { error?: string } | undefined;
      if (result && typeof result === "object" && "error" in result && result.error) {
        throw new Error(result.error as string);
      }
      return result;
    },
    onSuccess: () => {
      toast.success("Assinatura atualizada.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sub = data?.subscription ?? null;
  const status = sub?.status ?? "none";
  const badge = STATUS_LABEL[status] ?? {
    label: status,
    className: "bg-muted text-muted-foreground",
  };
  const busy = run.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Subscription Management</DialogTitle>
          <DialogDescription>{userEmail}</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center p-10 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando...
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider",
                  badge.className,
                )}
              >
                {badge.label}
              </span>
              {data?.daysLeft !== null && data?.daysLeft !== undefined && (
                <span className="text-xs text-muted-foreground">
                  {data.daysLeft >= 0
                    ? `${data.daysLeft} dia(s) restante(s)`
                    : `Expirada há ${Math.abs(data.daysLeft)} dia(s)`}
                </span>
              )}
            </div>

            <div className="glass rounded-2xl p-4">
              <Row label="Plano" value={sub?.plan_label ?? sub?.price_id ?? "—"} />
              <Row label="Provedor" value={sub?.subscription_provider ?? "—"} />
              <Row label="Stripe Customer ID" value={sub?.stripe_customer_id ?? "—"} />
              <Row label="Stripe Subscription ID" value={sub?.stripe_subscription_id ?? "—"} />
              <Row label="Próxima cobrança" value={fmt(sub?.current_period_end)} />
              <Row label="Data de expiração" value={fmt(data?.effectiveEnd)} />
              <Row label="Fim do trial" value={fmt(sub?.trial_ends_at)} />
              <Row label="Cancelada em" value={fmt(sub?.canceled_at)} />
              <Row
                label="Cancela no fim do período"
                value={sub?.cancel_at_period_end ? "Sim" : "Não"}
              />
              <Row label="Última fatura" value={sub?.latest_invoice ?? "—"} />
              <Row label="Última sincronização" value={fmt(sub?.last_sync_at)} />
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Controle manual
              </p>
              <div className="flex flex-wrap items-end gap-3">
                <div className="w-28">
                  <Label className="text-xs">Dias de trial</Label>
                  <Input
                    type="number"
                    min={1}
                    value={trialDays}
                    onChange={(e) => setTrialDays(e.target.value)}
                  />
                </div>
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={() =>
                    run.mutate(() =>
                      trialFn({ data: { userId, days: Number(trialDays) || 14 } }),
                    )
                  }
                >
                  <Gift className="mr-2 h-4 w-4" /> Grant Free Trial
                </Button>
              </div>

              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <Label className="text-xs">Data de expiração personalizada</Label>
                  <Input
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                  />
                </div>
                <Button
                  variant="secondary"
                  disabled={busy || !customDate}
                  onClick={() =>
                    run.mutate(() =>
                      expFn({ data: { userId, endsAt: `${customDate}T23:59:59` } }),
                    )
                  }
                >
                  Definir expiração
                </Button>
              </div>

              <div className="flex flex-wrap gap-3 pt-1">
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => run.mutate(() => syncFn({ data: { userId } }))}
                >
                  <RefreshCw className="mr-2 h-4 w-4" /> Sync with Stripe
                </Button>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => run.mutate(() => accessFn({ data: { userId, active: true } }))}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Reativar acesso
                </Button>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => run.mutate(() => accessFn({ data: { userId, active: false } }))}
                >
                  <Ban className="mr-2 h-4 w-4" /> Cancelar acesso
                </Button>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={async () => {
                    const result = (await portalFn({
                      data: { userId, returnUrl: window.location.origin + "/admin" },
                    })) as { url?: string; error?: string };
                    if (result.error || !result.url) {
                      toast.error(result.error ?? "Portal indisponível.");
                      return;
                    }
                    window.open(result.url, "_blank");
                  }}
                >
                  <CreditCard className="mr-2 h-4 w-4" /> Manage Subscription
                </Button>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Histórico de eventos
              </p>
              <div className="glass max-h-52 overflow-y-auto rounded-2xl p-3 text-sm">
                {data?.events?.length ? (
                  <ul className="space-y-2">
                    {data.events.map((ev) => (
                      <li key={ev.id} className="border-b border-border/30 pb-2 last:border-0">
                        <div className="flex justify-between gap-3">
                          <span className="font-medium">{ev.event_type}</span>
                          <span className="text-xs text-muted-foreground">
                            {fmt(ev.created_at)}
                          </span>
                        </div>
                        {ev.description && (
                          <p className="text-xs text-muted-foreground">{ev.description}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">Nenhum evento registrado.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

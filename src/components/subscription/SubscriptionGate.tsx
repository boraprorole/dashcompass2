import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AlertTriangle, CreditCard, LifeBuoy, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { getMySubscriptionAccess, openMyCustomerPortal } from "@/lib/subscriptions.functions";

type Access = { allowed: boolean; reason: string; isOwner?: boolean; status?: string };

/**
 * Bloqueia toda a aplicação quando a assinatura do Admin da Agência
 * está expirada, cancelada ou inadimplente.
 */
export function SubscriptionGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const accessFn = useServerFn(getMySubscriptionAccess);
  const portalFn = useServerFn(openMyCustomerPortal);

  const { data, isLoading } = useQuery({
    queryKey: ["subscription-access", user?.id],
    enabled: !!user,
    queryFn: () => accessFn() as Promise<Access>,
    staleTime: 60_000,
  });

  if (loading || isLoading || !user) return <>{children}</>;
  if (!data || data.allowed) return <>{children}</>;

  const isOwner = !!data.isOwner;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="glass-strong w-full max-w-lg rounded-3xl p-8 text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/15 text-destructive">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <h1 className="mb-3 text-2xl font-semibold">
          {isOwner ? "Assinatura inativa" : "Assinatura da organização expirada"}
        </h1>
        <p className="mb-8 text-sm text-muted-foreground">
          {isOwner
            ? "Sua assinatura do DashCompass expirou ou está com problemas de pagamento. Renove sua assinatura para continuar utilizando a plataforma."
            : "A assinatura da sua organização expirou. Entre em contato com o administrador da agência para renovar o acesso."}
        </p>

        {isOwner && (
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button asChild>
              <a href="/cadastro-empresa">
                <RefreshCw className="mr-2 h-4 w-4" /> Renew Subscription
              </a>
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                const result = (await portalFn({
                  data: { returnUrl: window.location.origin + "/reports" },
                })) as { url?: string; error?: string };
                if (result.error || !result.url) {
                  toast.error(result.error ?? "Portal indisponível.");
                  return;
                }
                window.open(result.url, "_blank");
              }}
            >
              <CreditCard className="mr-2 h-4 w-4" /> Update Payment Method
            </Button>
          </div>
        )}

        <div className="mt-4">
          <Button variant="ghost" asChild>
            <a href="mailto:suporte@dashcompass.com">
              <LifeBuoy className="mr-2 h-4 w-4" /> Contact Support
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}

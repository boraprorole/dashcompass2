import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { CheckCircle2, Loader2 } from "lucide-react";

export const Route = createFileRoute("/checkout/return")({
  validateSearch: (search: Record<string, unknown>): { session_id?: string } => ({
    session_id: typeof search.session_id === "string" ? search.session_id : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Assinatura confirmada — DashCompass" },
      { name: "description", content: "Confirmação da sua assinatura DashCompass." },
      { property: "og:title", content: "Assinatura confirmada — DashCompass" },
      { property: "og:description", content: "Confirmação da sua assinatura DashCompass." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CheckoutReturn,
});

function CheckoutReturn() {
  const { session_id: sessionId } = Route.useSearch();
  const navigate = useNavigate();
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setHasSession(Boolean(data.session)));
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-10 text-center">
        <div className="flex justify-center mb-8">
          <Logo iconClassName="h-8 w-8" textClassName="text-2xl" />
        </div>

        {!sessionId ? (
          <>
            <h1 className="text-2xl font-bold text-foreground mb-2">Nenhuma sessão encontrada</h1>
            <p className="text-muted-foreground mb-8">
              Não localizamos informações de pagamento nesta página.
            </p>
            <Button asChild className="w-full h-12 rounded-2xl font-bold">
              <Link to="/" search={{ lang: "pt" }}>Voltar ao início</Link>
            </Button>
          </>
        ) : (
          <>
            <CheckCircle2 className="mx-auto h-14 w-14 text-primary mb-6" />
            <h1 className="text-2xl font-bold text-foreground mb-2">Assinatura confirmada!</h1>
            <p className="text-muted-foreground mb-8">
              Sua conta está sendo preparada. Confirme seu e-mail se ainda não tiver feito isso.
            </p>
            {hasSession === null ? (
              <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <Button
                className="w-full h-12 rounded-2xl font-bold"
                onClick={() => navigate({ to: hasSession ? "/dashboard" : "/login" })}
              >
                {hasSession ? "Ir para o painel" : "Fazer login"}
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

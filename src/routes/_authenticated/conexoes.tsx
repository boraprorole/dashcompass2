import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Link2 } from "lucide-react";
import { listAccessibleReports } from "@/lib/meta.functions";
import { MetaConnectionsManager } from "@/components/meta/MetaConnectionsManager";

export const Route = createFileRoute("/_authenticated/conexoes")({
  beforeLoad: async () => {
    const { data, error } = await supabase.from("app_features").select("enabled").eq("key", "/conexoes").maybeSingle();
    if (error || (data && !data.enabled)) {
      throw redirect({ to: "/reports" });
    }
  },
  component: ConexoesPage,
});

function ConexoesPage() {
  const listReports = useServerFn(listAccessibleReports);
  const reportsQ = useQuery({
    queryKey: ["accessible-reports"],
    queryFn: () => listReports(),
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <Link2 className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-semibold">Conexões</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Conecte suas contas de <strong>Facebook</strong>, <strong>Instagram Business</strong> e{" "}
          <strong>Meta Ads</strong> aos relatórios da sua empresa. Você faz login direto no
          Facebook, nenhum acesso à Business Manager e conta de anúncios precisa ser compartilhado com o sistema.

        </p>
      </header>

      {reportsQ.isLoading ? (
        <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando relatórios...
        </div>
      ) : reportsQ.error ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {(reportsQ.error as Error).message}
        </div>
      ) : (reportsQ.data?.length ?? 0) === 0 ? (
        <div className="rounded-xl border border-border/40 bg-background/40 p-6 text-center text-sm text-muted-foreground">
          Nenhum relatório disponível. Entre em contato com o suporte para vincular sua empresa a um relatório.
        </div>
      ) : (
        <ul className="space-y-4">
          {reportsQ.data!.map((r) => (
            <li
              key={r.id}
              className="glass space-y-3 rounded-2xl p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-semibold">
                    {r.title?.trim() || r.company_name || "Sem título"}
                  </h2>
                  {r.company_name && r.title?.trim() && (
                    <p className="truncate text-[11px] text-muted-foreground">
                      {r.company_name}
                    </p>
                  )}
                </div>
              </div>
              <MetaConnectionsManager reportId={r.id} />
              <TikTokManager reportId={r.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

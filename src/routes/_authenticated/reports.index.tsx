import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { FileText, ArrowRight, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/reports/")({
  head: () => ({
    meta: [
      { title: "Relatórios" },
      { name: "description", content: "Seus relatórios disponíveis." },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const { user } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: ["my-reports", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("id, title, description, logo_url, created_at, companies(name)");
      if (error) throw error;
      const nameOf = (r: NonNullable<typeof data>[number]) =>
        (r.title?.trim() || r.companies?.name || "").toLocaleLowerCase("pt-BR");
      return [...(data ?? [])].sort((a, b) =>
        nameOf(a).localeCompare(nameOf(b), "pt-BR"),
      );
    },
  });

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <header className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <FileText className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Relatórios</h1>
          <p className="text-sm text-muted-foreground">
            Relatórios vinculados ao seu acesso.
          </p>
        </div>
      </header>

      {isLoading ? (
        <div className="glass-strong flex items-center justify-center rounded-3xl p-12 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando...
        </div>
      ) : error ? (
        <div className="glass-strong rounded-3xl p-8 text-destructive">
          Erro ao carregar relatórios.
        </div>
      ) : data && data.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((r) => (
            <article
              key={r.id}
              className="glass-strong flex flex-col gap-4 rounded-3xl p-5"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/15 text-primary">
                  {r.logo_url ? (
                    <img src={r.logo_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <FileText className="h-5 w-5" />
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-semibold tracking-tight">
                    {r.title?.trim() || r.companies?.name || "Sem título"}
                  </h3>

                  {r.description && (
                    <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">
                      {r.description}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-auto flex justify-end">
                <Link
                  to="/reports/$reportId"
                  params={{ reportId: r.id }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
                >
                  Abrir relatório <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="glass-strong rounded-3xl p-12 text-center text-sm text-muted-foreground">
          Nenhum relatório vinculado a você ainda. Entre em contato com um administrador.
        </div>
      )}
    </div>
  );
}

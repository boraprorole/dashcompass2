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
    <div className="mx-auto max-w-7xl space-y-10 px-2 py-4">
      <header className="flex items-center gap-6">
        <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-primary text-black">
          <FileText className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Relatórios</h1>
          <p className="mt-1 text-[15px] text-muted-foreground/80">
            Acesse e gerencie seus relatórios estratégicos.
          </p>
        </div>
      </header>

      {isLoading ? (
        <div className="flex items-center justify-center rounded-[20px] border border-border bg-card p-16 text-muted-foreground">
          <Loader2 className="mr-3 h-6 w-6 animate-spin text-primary" /> Carregando relatórios...
        </div>
      ) : error ? (
        <div className="glass-strong rounded-3xl p-8 text-destructive">
          Erro ao carregar relatórios.
        </div>
      ) : data && data.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((r) => (
            <article
              key={r.id}
              className="group flex flex-col gap-6 rounded-[20px] border border-border bg-card p-6 transition-all duration-300 hover:bg-[#1D1D1D] hover:scale-[1.01]"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[14px] bg-primary/10 text-primary border border-primary/20">
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

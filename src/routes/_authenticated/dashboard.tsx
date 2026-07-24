import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, Users, Activity, TrendingUp, Shield } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard" },
      { name: "description", content: "Visão geral do seu painel." },
    ],
  }),
  component: DashboardPage,
});

function StatCard({ label, value, icon: Icon, hint }: { label: string; value: string; icon: typeof LayoutDashboard; hint?: string }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("display_name").eq("id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header>
        <p className="text-sm text-muted-foreground">Bem-vindo de volta,</p>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          {profile?.display_name || user?.email?.split("@")[0]}
        </h1>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Sessões" value="—" icon={Activity} hint="em breve" />
        <StatCard label="Usuários" value="—" icon={Users} hint="em breve" />
        <StatCard label="Crescimento" value="—" icon={TrendingUp} hint="em breve" />
        <StatCard label="Acessos" value="1" icon={LayoutDashboard} hint="esta sessão" />
      </div>

      <div className="glass-strong rounded-3xl p-8">
        <h2 className="text-lg font-semibold">Comece por aqui</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Seu painel está pronto. Em breve adicionaremos seus dashboards específicos —
          é só me contar sobre o que eles devem ser.
        </p>
        {isAdmin && (
          <div className="mt-4 flex items-center gap-3">
            <Link
              to="/admin"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
            >
              <Shield className="h-4 w-4" />
              Painel Admin
            </Link>
            <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              Administrador
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

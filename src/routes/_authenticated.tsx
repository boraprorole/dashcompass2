import { createFileRoute, redirect, Outlet, Link, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import {
  UserCircle,
  Shield,
  LogOut,
  FileText,
  CalendarDays,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  ClipboardList,
  PackageCheck,
  Link2,
  Newspaper,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getDemandasEnabled } from "@/lib/demandas.functions";
import { Logo } from "@/components/Logo";
import { SubscriptionGate } from "@/components/subscription/SubscriptionGate";



export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ 
        to: "/login",
        search: {
          redirect: location.href
        }
      });
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user, isAdmin, isAdminGlobal, isTeam, isConexoes, signOut } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [isCollapsed, setIsCollapsed] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      
      // Se tiver avatar_url, garantir que ele seja um link válido (se for privado, precisa de signed URL)
      // No entanto, para simplificar e garantir funcionamento, vamos apenas retornar o dado.
      // Se o link expirou ou é inválido, o usuário terá que subir novamente ou o app precisará de lógica de refresh.
      return data;
    },
    staleTime: 60_000,
  });

  const getDemandasFn = useServerFn(getDemandasEnabled);
  const demandasQ = useQuery({
    queryKey: ["demandas-enabled"],
    queryFn: () => getDemandasFn(),
    staleTime: 60_000,
  });
  const demandasEnabled = !!demandasQ.data?.enabled;
  const canSeeDemandas = demandasEnabled && isTeam;
  const canSeeConexoes = isConexoes;

  const { data: features } = useQuery({
    queryKey: ["app-features"],
    queryFn: async () => {
      const { data, error } = await supabase.from("app_features").select("*");
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });

  const isEnabled = (key: string) => {
    const feature = features?.find(f => f.key === key);
    return feature ? feature.enabled : true;
  };

  const nav = [
    ...(isEnabled("/reports") ? [{ to: "/reports", label: "Relatórios", icon: FileText }] : []),
    ...((isAdmin || isTeam) && isEnabled("/pr") ? [{ to: "/pr", label: "PR & Clipping", icon: Newspaper }] : []),
    ...(isEnabled("/entregas") ? [{ to: "/entregas", label: "Entregas", icon: PackageCheck }] : []),
    ...(isEnabled("/schedule") ? [{ to: "/schedule", label: "Cronograma", icon: CalendarDays }] : []),
    ...(canSeeDemandas && isEnabled("/demandas") ? [{ to: "/demandas", label: "Demandas", icon: ClipboardList }] : []),
    ...(canSeeConexoes && isEnabled("/conexoes") ? [{ to: "/conexoes", label: "Conexões", icon: Link2 }] : []),
    ...(isAdmin && isEnabled("/ai") ? [{ to: "/ai", label: "Compass AI", icon: Sparkles }] : []),
    ...(isEnabled("/profile") ? [{ to: "/profile", label: "Perfil", icon: UserCircle }] : []),
    ...(isAdmin ? [{ to: "/admin", label: isAdminGlobal ? "Admin Global" : "Admin Agência", icon: Shield }] : []),
  ];


  return (
    <TooltipProvider>
      <div className="relative flex min-h-screen w-full bg-background overflow-x-hidden">
        {/* Sidebar */}
        <aside 
          className={cn(
            "fixed inset-y-0 left-0 hidden h-screen shrink-0 flex-col border-r border-border bg-sidebar py-10 transition-all duration-300 md:flex z-30",
            isCollapsed ? "w-[92px]" : "w-[240px]"
          )}
        >
          <div className="mb-8 flex items-center justify-between px-4">
            {!isCollapsed && (
              <Link to="/reports" className="overflow-hidden">
                <Logo textClassName="text-xl" />
              </Link>
            )}
            {isCollapsed && (
              <Link to="/reports" className="flex flex-1 items-center justify-center">
                <Logo isCollapsed />
              </Link>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={cn("h-8 w-8", isCollapsed ? "hidden" : "ml-auto")}
              title={isCollapsed ? "Expandir" : "Recolher"}
            >
              <PanelLeftClose className="h-4 w-4" />
            </Button>
          </div>
          
          {isCollapsed && (
            <div className="mb-8 flex items-center justify-center">
               <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsCollapsed(false)}
                className="h-8 w-8"
              >
                <PanelLeftOpen className="h-4 w-4" />
              </Button>
            </div>
          )}

        <nav className="flex-1 space-y-1">
          {nav.map((item) => {
            const active = pathname === item.to;
            const content = (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-[18px] px-5 py-4 text-sm font-medium transition-all duration-200",
                  active
                    ? "bg-primary text-black"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  isCollapsed && "justify-center px-2"
                )}
              >
                <item.icon className="h-4 w-4" />
                {!isCollapsed && <span>{item.label}</span>}
              </Link>
            );

            if (isCollapsed) {
              return (
                <Tooltip key={item.to} delayDuration={0}>
                  <TooltipTrigger asChild>
                    {content}
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              );
            }
            return content;
          })}
        </nav>

        <div className={cn("mt-auto border-t border-border pt-6 px-4")}>
          <div className={cn("flex items-center gap-3", isCollapsed ? "flex-col mb-4" : "mb-4")}>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-sm font-semibold text-primary">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                profile?.display_name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? "U"
              )}
            </div>
            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">{user?.email}</p>
                {isAdmin && <p className="text-[10px] uppercase tracking-wider text-primary">Admin</p>}
              </div>
            )}
          </div>
          <Button 
            variant="ghost" 
            size="default"
            className={cn("w-full justify-start mt-2", isCollapsed && "justify-center px-0")} 
            onClick={signOut}
          >
            <LogOut className={cn("h-4 w-4", !isCollapsed && "mr-2")} /> 
            {!isCollapsed && <span>Sair</span>}
          </Button>

          {!isCollapsed && (
            <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1 px-2 text-[10px] text-muted-foreground/50 font-medium uppercase tracking-widest">
              <Link to="/terms" className="hover:text-primary transition-colors">Termos</Link>
              <Link to="/privacy" className="hover:text-primary transition-colors">Privacidade</Link>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="glass fixed inset-x-0 top-0 z-20 flex items-center justify-between p-3 md:hidden">
        <Link to="/reports">
          <Logo iconClassName="h-6 w-6" textClassName="text-lg" className="gap-2" />
        </Link>
        <Button variant="ghost" size="sm" onClick={signOut}>
          <LogOut className="h-4 w-4" />
        </Button>
      </div>

      <main 
        className={cn(
          "relative flex-1 px-4 py-6 pt-20 md:px-8 md:py-10 md:pt-10 overflow-hidden max-w-full transition-all duration-300",
          isCollapsed ? "md:ml-[92px]" : "md:ml-[240px]"
        )}
      >
        <SubscriptionGate>
          <Outlet />
        </SubscriptionGate>


        {/* Mobile bottom nav */}
        <nav className="glass fixed inset-x-3 bottom-3 z-20 flex justify-around rounded-2xl p-2 md:hidden">
          {nav.map((item) => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl py-2 text-xs ${
                  active ? "bg-primary text-primary-foreground" : "text-foreground/70"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </main>
    </div>
    </TooltipProvider>
  );
}

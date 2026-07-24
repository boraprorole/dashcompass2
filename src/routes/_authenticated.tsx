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
  const { user, isAdmin, isTeam, isConexoes, signOut } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [isCollapsed, setIsCollapsed] = useState(false);

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
    ...(isAdmin ? [{ to: "/admin", label: "Admin", icon: Shield }] : []),
  ];


  return (
    <TooltipProvider>
      <div className="relative flex min-h-screen w-full bg-background overflow-x-hidden p-10">
        {/* Sidebar */}
        <aside 
          className={cn(
            "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border bg-sidebar py-10 transition-all duration-300 md:flex",
            isCollapsed ? "w-[92px]" : "w-[240px]"
          )}
        >
          <div className="mb-8 flex items-center justify-between">
            {!isCollapsed && (
              <Link to="/reports" className="flex flex-1 items-center justify-center overflow-hidden">
                <span className="font-sans text-xl font-bold tracking-tighter text-primary">
                  DashCompass
                </span>

              </Link>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={cn("h-8 w-8", isCollapsed && "mx-auto")}
              title={isCollapsed ? "Expandir" : "Recolher"}
            >
              {isCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </Button>
          </div>
          
          {isCollapsed && (
            <div className="mb-8 flex items-center justify-center overflow-hidden">
               <span className="font-sans text-xl font-bold text-primary">D</span>
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
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
              {user?.email?.[0]?.toUpperCase() ?? "U"}
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
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="glass fixed inset-x-0 top-0 z-20 flex items-center justify-between p-3 md:hidden">
        <Link to="/reports" className="flex items-center">
          <span className="font-sans text-xl font-bold tracking-tighter text-primary">
            DashCompass
          </span>

        </Link>
        <Button variant="ghost" size="sm" onClick={signOut}>
          <LogOut className="h-4 w-4" />
        </Button>
      </div>

      <main className="relative flex-1 px-4 py-6 pt-20 md:px-8 md:py-10 md:pt-10 overflow-hidden max-w-full">
        <Outlet />

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

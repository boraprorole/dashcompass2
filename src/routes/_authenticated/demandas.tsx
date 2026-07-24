import { createFileRoute, redirect } from "@tanstack/react-router";
import { ClipboardList } from "lucide-react";
import { getDemandasEnabled } from "@/lib/demandas.functions";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DemandasBoard } from "@/components/demandas/DemandasBoard";

export const Route = createFileRoute("/_authenticated/demandas")({
  head: () => ({
    meta: [
      { title: "Demandas" },
      { name: "description", content: "Acompanhamento de demandas." },
    ],
  }),
  beforeLoad: async () => {
    try {
      const { enabled } = await getDemandasEnabled();
      if (!enabled) throw redirect({ to: "/reports" });

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw redirect({ to: "/login" });

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id)
        .eq("role", "team");
      if (!roles || roles.length === 0) throw redirect({ to: "/reports" });
    } catch (e) {
      if ((e as { isRedirect?: boolean })?.isRedirect) throw e;
      throw redirect({ to: "/reports" });
    }
  },
  component: DemandasPage,
});

function DemandasPage() {
  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <header className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <ClipboardList className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Demandas</h1>
          <p className="text-sm text-muted-foreground">
            Organize e acompanhe as pautas da equipe.
          </p>
        </div>
      </header>

      <Tabs defaultValue="mine" className="space-y-4">
        <TabsList>
          <TabsTrigger value="mine">Minha Pauta</TabsTrigger>
          <TabsTrigger value="status">Pauta por Status</TabsTrigger>
          <TabsTrigger value="assignee">Pauta por Responsável</TabsTrigger>
        </TabsList>
        <TabsContent value="mine">
          <DemandasBoard mode="mine" />
        </TabsContent>
        <TabsContent value="status">
          <DemandasBoard mode="status" />
        </TabsContent>
        <TabsContent value="assignee">
          <DemandasBoard mode="assignee" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

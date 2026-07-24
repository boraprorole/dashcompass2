import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/callback")({
  beforeLoad: async ({ search }: { search: any }) => {
    const code = search.code;
    const next = search.next || "/reports";

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        throw redirect({ to: next });
      }
    }
    
    throw redirect({ to: "/login" });
  },
});

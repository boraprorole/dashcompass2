import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/public/stripe-webhook-mock-callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const email = url.searchParams.get("email");
        const planId = url.searchParams.get("planId");
        const companyName = url.searchParams.get("companyName");

        if (!email) return new Response("Missing email", { status: 400 });

        try {
          // 1. Find the user by email
          const { data: users, error: userError } = await supabaseAdmin.auth.admin.listUsers();
          if (userError) throw userError;
          
          const user = users.users.find(u => u.email === email);
          if (!user) throw new Error("User not found");

          // 2. Create or Update Agency
          // Note: In this schema agencies don't have owner_id directly on the table based on types,
          // but user_roles links user to agency.
          let agencyId: string;
          
          const { data: existingRole } = await supabaseAdmin
            .from("user_roles")
            .select("agency_id")
            .eq("user_id", user.id)
            .eq("role", "admin_agencia")
            .maybeSingle();

          if (existingRole?.agency_id) {
            agencyId = existingRole.agency_id;
          } else {
            // Create new agency
            const { data: newAgency, error: agencyErr } = await supabaseAdmin
              .from("agencies")
              .insert({ 
                name: companyName || "Minha Agência"
              })
              .select("id")
              .single();
            if (agencyErr) throw agencyErr;
            agencyId = newAgency.id;

            // Assign role with agency_id
            await supabaseAdmin.from("user_roles").insert({
              user_id: user.id,
              role: 'admin_agencia',
              agency_id: agencyId
            });
          }

          // 3. Create initial report
          await supabaseAdmin.from("reports").insert({
            title: companyName || "Dashboard Inicial",
            agency_id: agencyId,
            created_by: user.id
          });

          // Redirect to dashboard
          return new Response(null, {
            status: 302,
            headers: { Location: "/dashboard" }
          });
        } catch (err: any) {
          console.error("Error in stripe mock callback:", err);
          return new Response("Error processing subscription: " + err.message, { status: 500 });
        }
      }
    }
  }
});

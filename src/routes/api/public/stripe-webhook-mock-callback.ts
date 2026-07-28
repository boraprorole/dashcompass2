import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * MOCK CALLBACK ROUTE
 * In a real Stripe implementation, this would be the success_url.
 * We use a server route to simulate the webhook processing or post-payment logic.
 */
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

          // 2. Assign 'admin_agencia' role if they don't have it
          const { data: roles } = await supabaseAdmin
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id);
          
          if (!roles?.some(r => r.role === 'admin_agencia')) {
            await supabaseAdmin.from("user_roles").insert({
              user_id: user.id,
              role: 'admin_agencia'
            });
          }

          // 3. Create or Update Company
          const { data: agency } = await supabaseAdmin
             .from("agencies")
             .select("id")
             .eq("owner_id", user.id)
             .maybeSingle();
          
          let agencyId = agency?.id;
          if (!agencyId) {
             const { data: newAgency, error: agencyErr } = await supabaseAdmin
               .from("agencies")
               .insert({ 
                 name: companyName || "Minha Agência",
                 owner_id: user.id 
               })
               .select("id")
               .single();
             if (agencyErr) throw agencyErr;
             agencyId = newAgency.id;
          }

          // 4. Create initial report for the company
          await supabaseAdmin.from("reports").insert({
            name: companyName || "Dashboard Inicial",
            agency_id: agencyId,
            user_id: user.id
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

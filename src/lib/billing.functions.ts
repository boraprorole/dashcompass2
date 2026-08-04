import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Resumo financeiro + uso da agência do usuário autenticado. */
export const getAgencyBilling = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getAgencyBillingImpl } = await import("./billing.server");
    return getAgencyBillingImpl(context.userId);
  });

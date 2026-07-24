import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getGadsMetrics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ 
    reportId: z.string().uuid(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional()
  }).parse(input))
  .handler(async ({ data }) => {
    // Implementação mock/stub para Google Ads
    return {
      cost: 2500.50,
      impressions: 120000,
      clicks: 3400,
      conversions: 150,
      cpc: 0.74,
      ctr: 2.83,
      campaigns: [
        { name: "Search - Brand", cost: 500, conversions: 45 },
        { name: "Display - Prospecting", cost: 2000, conversions: 105 }
      ]
    };
  });

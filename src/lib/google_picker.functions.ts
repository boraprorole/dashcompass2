import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  listGa4PropertiesForReport,
  setGa4Property,
  listGscSitesForReport,
  setGscSite,
  listGoogleAdsCustomersForReport,
  setGoogleAdsCustomer,
} from "./google_picker.server";

const reportOnly = z.object({ reportId: z.string().uuid() });

export const listGa4Properties = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => reportOnly.parse(input))
  .handler(async ({ context, data }) => listGa4PropertiesForReport(context.userId, data.reportId));

export const chooseGa4Property = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ reportId: z.string().uuid(), propertyId: z.string().min(1) }).parse(input),
  )
  .handler(async ({ context, data }) => setGa4Property(context.userId, data.reportId, data.propertyId));

export const listGscSites = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => reportOnly.parse(input))
  .handler(async ({ context, data }) => listGscSitesForReport(context.userId, data.reportId));

export const chooseGscSite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ 
      reportId: z.string().uuid(), 
      siteUrl: z.string().min(1),
      type: z.string().optional()
    }).parse(input),
  )
  .handler(async ({ context, data }) => setGscSite(context.userId, data.reportId, data.siteUrl, data.type));

export const listGoogleAdsCustomers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => reportOnly.parse(input))
  .handler(async ({ context, data }) =>
    listGoogleAdsCustomersForReport(context.userId, data.reportId),
  );

export const chooseGoogleAdsCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ reportId: z.string().uuid(), customerId: z.string().min(1) }).parse(input),
  )
  .handler(async ({ context, data }) =>
    setGoogleAdsCustomer(context.userId, data.reportId, data.customerId),
  );

export const disconnectGoogleUnified = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ reportId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    // Delete from all Google-related tables for this report
    await Promise.all([
      supabaseAdmin.from("ga_connections").delete().eq("report_id", data.reportId),
      supabaseAdmin.from("gsc_connections").delete().eq("report_id", data.reportId),
      supabaseAdmin.from("google_ads_connections").delete().eq("report_id", data.reportId)
    ]);
    
    return { success: true };
  });

/**
 * Desvincula UM serviço Google específico (GA4, GSC ou Google Ads) do relatório.
 * Valida o acesso do usuário ao relatório antes de remover a conexão.
 */
export const disconnectGoogleService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        reportId: z.string().uuid(),
        service: z.enum(["ga", "gsc", "gads"]),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    // Verificação de acesso via RLS: se o usuário não enxerga o relatório, aborta.
    const { data: report, error } = await context.supabase
      .from("reports")
      .select("id")
      .eq("id", data.reportId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!report) throw new Error("Relatório não encontrado ou sem permissão.");

    const TABLE_BY_SERVICE = {
      ga: "ga_connections",
      gsc: "gsc_connections",
      gads: "google_ads_connections",
    } as const;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: delError } = await supabaseAdmin
      .from(TABLE_BY_SERVICE[data.service])
      .delete()
      .eq("report_id", data.reportId);
    if (delError) throw new Error(delError.message);

    return { success: true, service: data.service };
  });

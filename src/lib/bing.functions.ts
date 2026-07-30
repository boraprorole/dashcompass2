import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getBingAuthUrl } from "./bing_auth.server";

export const getBingConnectUrl = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ reportId: z.string() }).parse(data))
  .handler(async ({ data, context }) => {
    return await getBingAuthUrl(data.reportId, context.userId);
  });

export const connectBing = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z.object({
      reportId: z.string(),
      siteUrl: z.string(),
      apiKey: z.string().optional(),
    }).parse(data)
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }) => {
    const { reportId, siteUrl, apiKey } = data;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("bing_connections")
      .upsert({
        report_id: reportId,
        site_url: siteUrl,
        api_key: apiKey,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'report_id' });

    if (error) {
      console.error("Error connecting Bing:", error);
      throw new Error("Failed to connect Bing Webmaster Tools");
    }

    return { success: true };
  });

export const disconnectBing = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ reportId: z.string() }).parse(data))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("bing_connections")
      .delete()
      .eq("report_id", data.reportId);

    if (error) {
      console.error("Error disconnecting Bing:", error);
      throw new Error("Failed to disconnect Bing Webmaster Tools");
    }

    return { success: true };
  });

export const getBingMetrics = createServerFn({ method: "GET" })
  .inputValidator((data) =>
    z.object({
      reportId: z.string(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    }).parse(data)
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }) => {
    const { reportId, dateFrom, dateTo } = data;
    const { getBingMetricsReal } = await import("./bing_picker.server");
    return await getBingMetricsReal(reportId, dateFrom, dateTo);
  });

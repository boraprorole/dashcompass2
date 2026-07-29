import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getBingAuthUrl } from "./bing_auth.server";

export const getBingConnectUrl = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ reportId: z.string() }).parse(data))
  .handler(async ({ data, context }) => {
    // In a real app, context might provide userId. For now we fetch it or require it.
    const { data: userData } = await supabaseAdmin.auth.getUser();
    if (!userData.user) throw new Error("Não autenticado");
    
    return await getBingAuthUrl(data.reportId, userData.user.id);
  });

export const connectBing = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z.object({
      reportId: z.string(),
      siteUrl: z.string(),
      apiKey: z.string().optional(),
    }).parse(data)
  )
  .handler(async ({ data }) => {
    const { reportId, siteUrl, apiKey } = data;

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
  .handler(async ({ data }) => {
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


  .inputValidator((data) =>
    z.object({
      reportId: z.string(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    }).parse(data)
  )
  .handler(async ({ data }) => {
    const { reportId } = data;

    const { data: connection, error } = await supabaseAdmin
      .from("bing_connections")
      .select("*")
      .eq("report_id", reportId)
      .maybeSingle();

    if (error || !connection) {
      return { connected: false };
    }

    // This would call the Bing Webmaster Tools API
    // https://learn.microsoft.com/en-us/bingwebmaster/api-overview
    
    // Returning mock data for now to demonstrate the UI
    return {
      connected: true,
      siteUrl: connection.site_url,
      metrics: [
        { date: "2024-07-01", clicks: 120, impressions: 4500, ctr: 2.6, position: 12.4 },
        { date: "2024-07-02", clicks: 150, impressions: 4800, ctr: 3.1, position: 11.8 },
        { date: "2024-07-03", clicks: 110, impressions: 4200, ctr: 2.6, position: 13.1 },
        { date: "2024-07-04", clicks: 180, impressions: 5200, ctr: 3.4, position: 10.5 },
      ],
      topKeywords: [
        { query: "dashcompass", clicks: 50, impressions: 200, ctr: 25, position: 1.2 },
        { query: "marketing dashboard", clicks: 30, impressions: 1200, ctr: 2.5, position: 5.4 },
        { query: "seo reporting tool", clicks: 25, impressions: 800, ctr: 3.1, position: 4.2 },
      ]
    };
  });

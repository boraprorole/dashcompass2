import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { refreshAccessToken } from "./ga.server";

export const getGadsMetrics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ 
    reportId: z.string().uuid(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional()
  }).parse(input))
  .handler(async ({ data }) => {
    const { data: conn } = await supabaseAdmin
      .from("google_ads_connections")
      .select("refresh_token, customer_id")
      .eq("report_id", data.reportId)
      .maybeSingle();

    if (!conn || !conn.customer_id) {
      // Se não estiver conectado, retornamos null em vez de simulação
      return null;
    }

    const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
    if (!developerToken) {
      console.warn("GOOGLE_ADS_DEVELOPER_TOKEN missing");
      return null;
    }

    try {
      const { access_token } = await refreshAccessToken(conn.refresh_token);
      const customerId = conn.customer_id.replace(/-/g, "");
      const loginCustomerId = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID?.replace(/-/g, "");

      const headers: Record<string, string> = {
        authorization: `Bearer ${access_token}`,
        "developer-token": developerToken,
        "content-type": "application/json",
      };
      if (loginCustomerId) headers["login-customer-id"] = loginCustomerId;

      // Query para métricas básicas
      const query = `
        SELECT 
          metrics.cost_micros, 
          metrics.impressions, 
          metrics.clicks, 
          metrics.conversions, 
          metrics.average_cpc,
          metrics.ctr,
          campaign.name
        FROM campaign
        WHERE segments.date DURING LAST_30_DAYS
      `;

      const res = await fetch(
        `https://googleads.googleapis.com/v18/customers/${customerId}/googleAds:search`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ query }),
        }
      );

      if (!res.ok) {
        const err = await res.text();
        console.error("Ads API error:", err);
        return null;
      }

      const json = await res.json();
      const results = json.results || [];

      let totalCost = 0;
      let totalImpressions = 0;
      let totalClicks = 0;
      let totalConversions = 0;
      const campaigns: any[] = [];

      results.forEach((row: any) => {
        const cost = (Number(row.metrics.costMicros) || 0) / 1_000_000;
        const impressions = Number(row.metrics.impressions) || 0;
        const clicks = Number(row.metrics.clicks) || 0;
        const conversions = Number(row.metrics.conversions) || 0;

        totalCost += cost;
        totalImpressions += impressions;
        totalClicks += clicks;
        totalConversions += conversions;

        campaigns.push({
          name: row.campaign.name,
          cost,
          conversions
        });
      });

      return {
        cost: totalCost,
        impressions: totalImpressions,
        clicks: totalClicks,
        conversions: totalConversions,
        cpc: totalClicks > 0 ? totalCost / totalClicks : 0,
        ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
        campaigns: campaigns.sort((a, b) => b.cost - a.cost).slice(0, 5)
      };

    } catch (e) {
      console.error("Error fetching Ads metrics:", e);
      return null;
    }
  });
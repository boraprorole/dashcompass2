import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { refreshAccessToken } from "./ga.server";

export const getGscMetrics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ 
    reportId: z.string().uuid(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional()
  }).parse(input))
  .handler(async ({ data }) => {
    const { data: conn } = await supabaseAdmin
      .from("gsc_connections")
      .select("refresh_token, site_url")
      .eq("report_id", data.reportId)
      .maybeSingle();

    if (!conn || !conn.site_url) {
      // Se não houver site configurado, retornamos null para não exibir dados mockados
      return null;
    }

    try {
      const { access_token } = await refreshAccessToken(conn.refresh_token);
      const siteUrl = conn.site_url;

      // Definir datas padrão se não fornecidas (últimos 30 dias)
      const endDate = data.dateTo || new Date().toISOString().split('T')[0];
      const startDate = data.dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const res = await fetch(
        `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${access_token}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            startDate,
            endDate,
            dimensions: ["query"],
            rowLimit: 10,
          }),
        }
      );

      if (!res.ok) {
        const err = await res.text();
        console.error("GSC API error:", err);
        return null;
      }

      const json = await res.json();
      const rows = json.rows || [];

      let totalClicks = 0;
      let totalImpressions = 0;
      let totalPosition = 0;
      const keywords: any[] = [];

      rows.forEach((row: any) => {
        totalClicks += row.clicks;
        totalImpressions += row.impressions;
        totalPosition += row.position;
        keywords.push({
          query: row.keys[0],
          clicks: row.clicks,
          impressions: row.impressions,
          ctr: row.ctr * 100
        });
      });

      return {
        clicks: totalClicks,
        impressions: totalImpressions,
        ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
        position: rows.length > 0 ? totalPosition / rows.length : 0,
        keywords
      };

    } catch (e) {
      console.error("Error fetching GSC metrics:", e);
      return null;
    }
  });
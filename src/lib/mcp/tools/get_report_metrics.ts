import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { getReportMetricsImpl } from "../../windsor.server";

export default defineTool({
  name: "get_report_metrics",
  title: "Get report metrics",
  description:
    "Aggregated KPIs for ALL Windsor connectors linked to the report (Instagram, Meta Ads, GA4, GSC, TikTok, LinkedIn, Google Ads, Facebook). Use this for an overall performance view.",
  inputSchema: {
    report_id: z.string().uuid().describe("The report UUID"),
    datePreset: z
      .enum(["last_7d", "last_30d", "last_90d", "last_y"])
      .optional()
      .describe("Relative period. Default last_30d."),
    dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (input, ctx: ToolContext) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data: userData, error: userErr } = await supabase.auth.getUser(ctx.getToken());
    if (userErr || !userData.user) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const KNOWN = [
      "instagram",
      "facebook",
      "facebook_ads",
      "google_ads",
      "google_analytics_4",
      "google_search_console",
      "tiktok",
      "linkedin",
    ] as const;
    try {
      const metrics = await getReportMetricsImpl(userData.user.id, input.report_id, {
        datePreset: input.datePreset ?? "last_30d",
        dateFrom: input.dateFrom,
        dateTo: input.dateTo,
      });
      const available = Array.from(new Set(metrics.map((m) => m.connector)));
      const missing = KNOWN.filter((k) => !available.includes(k));
      const errored = metrics.filter((m) => m.error).map((m) => ({ connector: m.connector, error: m.error }));
      const payload = {
        report_id: input.report_id,
        period: {
          datePreset: input.datePreset ?? "last_30d",
          dateFrom: input.dateFrom ?? null,
          dateTo: input.dateTo ?? null,
        },
        available_connectors: available,
        missing_connectors: missing,
        errored_connectors: errored,
        note:
          missing.length > 0
            ? `This report has no connection for: ${missing.join(", ")}. Missing connectors are NOT an error — they simply were not linked to this report. Answer using the connectors listed in available_connectors; do not claim the tool failed.`
            : "All known connectors are linked.",
        metrics,
      };
      return {
        content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
        structuredContent: payload as unknown as Record<string, unknown>,
      };
    } catch (e) {
      return { content: [{ type: "text", text: (e as Error).message }], isError: true };
    }
  },
});

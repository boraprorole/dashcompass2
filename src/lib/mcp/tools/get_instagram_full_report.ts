import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { getInstagramFullReportImpl } from "../../instagram-full.server";

export default defineTool({
  name: "get_instagram_full_report",
  title: "Get full Instagram dataset",
  description:
    "COMPLETE Instagram dataset for a report — use this whenever the user asks for an analysis, diagnosis, insights or strategy about Instagram. Returns everything at once: account KPIs with previous-period comparison and daily series, audience demographics (gender, age, cities, countries), the full list of posts in the period (caption, hashtags, permalink, media type, timestamp, likes, comments, shares, saves, reach, views, engagement) and derived analytics (averages, engagement rate, performance by format, by weekday, by hour, top hashtags and mentions).",
  inputSchema: {
    report_id: z.string().uuid().describe("The report UUID"),
    datePreset: z
      .enum(["last_7d", "last_30d", "last_90d", "last_y"])
      .optional()
      .describe("Relative period. Default last_30d."),
    dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    postLimit: z
      .number()
      .int()
      .min(1)
      .max(500)
      .optional()
      .describe("Max posts to return. Default 200 (all posts in the period)."),
    includeMetrics: z.boolean().optional().describe("Include account KPIs + daily series. Default true."),
    includeAudience: z.boolean().optional().describe("Include audience demographics. Default true."),
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
    try {
      const report = await getInstagramFullReportImpl(
        userData.user.id,
        input.report_id,
        {
          datePreset: input.datePreset ?? "last_30d",
          dateFrom: input.dateFrom,
          dateTo: input.dateTo,
        },
        input.postLimit ?? 200,
        input.includeMetrics ?? true,
        input.includeAudience ?? true,
      );
      return {
        content: [{ type: "text", text: JSON.stringify(report, null, 2) }],
        structuredContent: { report },
      };
    } catch (e) {
      return { content: [{ type: "text", text: (e as Error).message }], isError: true };
    }
  },
});

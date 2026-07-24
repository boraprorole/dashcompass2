import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { getMetaAdsCreativesImpl } from "../../windsor.server";

export default defineTool({
  name: "get_meta_ads_creatives",
  title: "Get Meta Ads creatives ranking",
  description:
    "Per-creative Meta Ads performance for each ad account linked to the report: spend, impressions, reach, clicks, CTR, CPC, CPM, frequency, leads, CPL and a health status (winning/fatigue/low-ctr/expensive/healthy). Works with both Windsor and Meta OAuth connected accounts.",
  inputSchema: {
    report_id: z.string().uuid().describe("The report UUID"),
    datePreset: z
      .enum(["last_7d", "last_30d", "last_90d", "last_y"])
      .optional()
      .describe("Relative period. Default last_30d."),
    dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    limit: z.number().int().min(1).max(50).optional(),
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
      const accounts = await getMetaAdsCreativesImpl(
        userData.user.id,
        input.report_id,
        {
          datePreset: input.datePreset ?? "last_30d",
          dateFrom: input.dateFrom,
          dateTo: input.dateTo,
        },
        input.limit ?? 20,
      );
      return {
        content: [{ type: "text", text: JSON.stringify(accounts, null, 2) }],
        structuredContent: { accounts },
      };
    } catch (e) {
      return { content: [{ type: "text", text: (e as Error).message }], isError: true };
    }
  },
});

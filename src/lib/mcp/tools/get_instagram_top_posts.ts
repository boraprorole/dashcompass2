import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { getTopInstagramPostsImpl } from "../../windsor.server";

export default defineTool({
  name: "get_instagram_top_posts",
  title: "Get Instagram top posts",
  description:
    "Fetch the top Instagram posts for a report in a given period. Returns real post-level data (caption, permalink, likes, comments, reach, engagement).",
  inputSchema: {
    report_id: z.string().uuid().describe("The report UUID"),
    datePreset: z
      .enum(["last_7d", "last_30d", "last_90d", "last_y"])
      .optional()
      .describe("Relative period. Default last_30d."),
    dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    limit: z.number().int().min(1).max(24).optional(),
    sortBy: z.enum(["engagement", "reach", "likes", "views"]).optional(),
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
      const posts = await getTopInstagramPostsImpl(
        userData.user.id,
        input.report_id,
        {
          datePreset: input.datePreset ?? "last_30d",
          dateFrom: input.dateFrom,
          dateTo: input.dateTo,
        },
        input.limit ?? 6,
        input.sortBy ?? "engagement",
      );
      return {
        content: [{ type: "text", text: JSON.stringify(posts, null, 2) }],
        structuredContent: { posts },
      };
    } catch (e) {
      return { content: [{ type: "text", text: (e as Error).message }], isError: true };
    }
  },
});

import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { getInstagramAudienceImpl } from "../../windsor.server";

export default defineTool({
  name: "get_instagram_audience",
  title: "Get Instagram audience demographics",
  description:
    "Audience demographics (gender, age, gender+age, top cities, top countries) for each Instagram account linked to the report. Works with both Windsor and Meta OAuth connected accounts.",
  inputSchema: {
    report_id: z.string().uuid().describe("The report UUID"),
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
      const audiences = await getInstagramAudienceImpl(userData.user.id, input.report_id);
      return {
        content: [{ type: "text", text: JSON.stringify(audiences, null, 2) }],
        structuredContent: { audiences },
      };
    } catch (e) {
      return { content: [{ type: "text", text: (e as Error).message }], isError: true };
    }
  },
});

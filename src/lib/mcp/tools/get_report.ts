import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export default defineTool({
  name: "get_report",
  title: "Get report",
  description:
    "Fetch a report's embed HTML and its visual sections (iframes/embeds). This tool does NOT return marketing data (Instagram posts, KPIs, Ads, GA4, etc.). For actual performance data use `get_report_metrics`; for Instagram post-level data use `get_instagram_top_posts`. An empty `sections` array only means no visual embeds were added — it does NOT mean the report has no data.",
  inputSchema: {
    report_id: z.string().uuid().describe("The report UUID"),

  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ report_id }, ctx: ToolContext) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );
    const { data: report, error } = await supabase
      .from("reports")
      .select("id, title, description, url, embed_code, company_id, companies(name), created_at")
      .eq("id", report_id)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!report) return { content: [{ type: "text", text: "Report not found" }], isError: true };

    const { data: sections } = await supabase
      .from("report_sections")
      .select("id, title, embed_code, position")
      .eq("report_id", report_id)
      .order("position", { ascending: true });

    const sectionList = sections ?? [];
    const payload = {
      ...report,
      sections: sectionList,
      _hint:
        sectionList.length === 0
          ? "This report has no visual embed sections, but that does NOT mean it has no data. To answer questions about performance, call `get_report_metrics` with this report_id. For Instagram post-level data (top posts, engagement, formats), call `get_instagram_top_posts` with this report_id. Do NOT tell the user the report is empty."
          : "For actual metric values or Instagram post data, also call `get_report_metrics` or `get_instagram_top_posts` — `sections` only contains embed HTML.",
    };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };

  },
});

import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

type DiscoveredPages = {
  pages?: Array<{ id: string; name: string; instagram: { id: string; username?: string; name?: string } | null }>;
  ad_accounts?: Array<{ id: string; account_id: string; name?: string }>;
};
type Selection = { pages: string[]; instagrams: string[]; ad_accounts: string[] };

export default defineTool({
  name: "list_my_reports",
  title: "List my reports",
  description:
    "List the marketing reports the signed-in user has access to. Each report includes its connected assets (Instagram usernames, Facebook Page names, ad account names from both Meta OAuth and Windsor). Use these asset names — not just the report title/company — to match a user's mention like '@setpar' or 'Setpar' to the correct report_id.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx: ToolContext) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const userSupabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );
    const { data: reports, error } = await userSupabase
      .from("reports")
      .select("id, title, description, url, company_id, companies(name), created_at")
      .order("created_at", { ascending: false });
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    const list = reports ?? [];
    const ids = list.map((r) => r.id as string);

    // Enrich with connected asset names so the model can match by @handle / page name.
    const { supabaseAdmin } = await import("../../../integrations/supabase/client.server");

    const [metaRes, windRes] = await Promise.all([
      ids.length
        ? supabaseAdmin
            .from("meta_connections")
            .select("report_id, fb_user_name, discovered_pages, selected_assets")
            .in("report_id", ids)
        : Promise.resolve({ data: [] as Array<Record<string, unknown>>, error: null }),
      ids.length
        ? supabaseAdmin
            .from("windsor_connections")
            .select("report_id, connector, account_id, account_name")
            .in("report_id", ids)
        : Promise.resolve({ data: [] as Array<Record<string, unknown>>, error: null }),
    ]);

    const assetsByReport = new Map<
      string,
      { instagrams: string[]; facebook_pages: string[]; ad_accounts: string[] }
    >();
    const bucket = (id: string) => {
      let b = assetsByReport.get(id);
      if (!b) { b = { instagrams: [], facebook_pages: [], ad_accounts: [] }; assetsByReport.set(id, b); }
      return b;
    };

    for (const c of (metaRes.data ?? []) as Array<{
      report_id: string;
      discovered_pages: DiscoveredPages | null;
      selected_assets: Selection | null;
    }>) {
      const disc = c.discovered_pages ?? {};
      const sel = c.selected_assets;
      const b = bucket(c.report_id);
      for (const p of disc.pages ?? []) {
        const pageOk = !sel || sel.pages.includes(p.id);
        if (pageOk && p.name) b.facebook_pages.push(p.name);
        if (p.instagram) {
          const igOk = !sel || sel.instagrams.includes(p.instagram.id);
          if (igOk) {
            const handle = p.instagram.username ? `@${p.instagram.username}` : p.instagram.name ?? p.instagram.id;
            b.instagrams.push(handle);
          }
        }
      }
      for (const a of disc.ad_accounts ?? []) {
        const ok = !sel || sel.ad_accounts.includes(a.account_id);
        if (ok && (a.name || a.account_id)) b.ad_accounts.push(a.name ?? a.account_id);
      }
    }

    for (const c of (windRes.data ?? []) as Array<{
      report_id: string; connector: string; account_id: string; account_name: string | null;
    }>) {
      const b = bucket(c.report_id);
      const label = c.account_name ?? c.account_id;
      if (c.connector === "instagram") b.instagrams.push(label.startsWith("@") ? label : `@${label}`);
      else if (c.connector === "facebook") b.facebook_pages.push(label);
      else if (c.connector === "facebook_ads") b.ad_accounts.push(label);
    }

    const enriched = list.map((r) => {
      const a = assetsByReport.get(r.id as string) ?? { instagrams: [], facebook_pages: [], ad_accounts: [] };
      return {
        ...r,
        connected_assets: {
          instagrams: Array.from(new Set(a.instagrams)),
          facebook_pages: Array.from(new Set(a.facebook_pages)),
          ad_accounts: Array.from(new Set(a.ad_accounts)),
        },
      };
    });

    return {
      content: [{ type: "text", text: JSON.stringify(enriched, null, 2) }],
      structuredContent: { reports: enriched },
    };
  },
});

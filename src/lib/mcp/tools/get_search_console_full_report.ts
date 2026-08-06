import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { getGscFullReportImpl, type GscPreset } from "../../gsc-full.server";

export default defineTool({
  name: "get_search_console_full_report",
  title: "Get full Google Search Console dataset",
  description:
    "Dataset COMPLETO do Google Search Console de um relatório: totais do período com comparativo do período anterior, série diária, todas as queries, páginas, pares página+query, dispositivos, países, aparência na busca e oportunidades (striking distance e alta impressão com CTR baixo). Use sempre que o usuário pedir análise, diagnóstico, SEO, palavras-chave, cliques, impressões, CTR ou posição no Google.",
  inputSchema: {
    report_id: z.string().uuid().describe("The report UUID"),
    datePreset: z
      .enum(["last_7d", "last_28d", "last_30d", "last_90d", "last_y"])
      .optional()
      .describe("Período relativo. Padrão last_28d."),
    dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    rowLimit: z.number().int().min(1).max(1000).optional().describe("Máximo de linhas por dimensão. Padrão 250."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (input, ctx: ToolContext) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userErr } = await supabase.auth.getUser(ctx.getToken());
    if (userErr || !userData.user) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    try {
      const payload = await getGscFullReportImpl(userData.user.id, input.report_id, {
        preset: (input.datePreset ?? "last_28d") as GscPreset,
        dateFrom: input.dateFrom,
        dateTo: input.dateTo,
        rowLimit: input.rowLimit,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(payload) }],
        structuredContent: payload as unknown as Record<string, unknown>,
      };
    } catch (e) {
      return { content: [{ type: "text", text: (e as Error).message }], isError: true };
    }
  },
});

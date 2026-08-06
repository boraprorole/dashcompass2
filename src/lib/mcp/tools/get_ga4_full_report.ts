import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { getGa4FullReportImpl, type GaPreset } from "../../ga4-full.server";

export default defineTool({
  name: "get_ga4_full_report",
  title: "Get full Google Analytics 4 dataset",
  description:
    "Dataset COMPLETO do Google Analytics 4 de um relatório: KPIs do período com comparativo do período anterior (usuários, novos usuários, sessões, sessões engajadas, pageviews, taxa de engajamento, duração média, rejeição, eventos, conversões), série diária, canais, origem/mídia, campanhas, landing pages, páginas mais vistas, eventos, dispositivos, países, cidades, idiomas, navegadores, demografia (idade/gênero), novo vs recorrente e desempenho por hora. Use sempre que o usuário pedir análise, diagnóstico, tráfego, aquisição, conversões ou comportamento do site.",
  inputSchema: {
    report_id: z.string().uuid().describe("The report UUID"),
    datePreset: z
      .enum(["last_7d", "last_28d", "last_30d", "last_90d", "last_y"])
      .optional()
      .describe("Período relativo. Padrão last_28d."),
    dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    rowLimit: z.number().int().min(1).max(250).optional().describe("Máximo de linhas por dimensão. Padrão 50."),
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
      const payload = await getGa4FullReportImpl(userData.user.id, input.report_id, {
        preset: (input.datePreset ?? "last_28d") as GaPreset,
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

import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export default defineTool({
  name: "get_tiktok_report",
  title: "Get TikTok report",
  description:
    "Relatório completo do TikTok conectado ao relatório: KPIs do período com comparativo (views, likes, comentários, compartilhamentos, taxa de engajamento), série diária, dados do perfil e a lista de vídeos com métricas. Use SEMPRE esta ferramenta para qualquer pedido de análise de TikTok — a conexão TikTok é nativa e NÃO aparece em `get_report_metrics`.",
  inputSchema: {
    report_id: z.string().uuid().describe("The report UUID"),
    datePreset: z
      .enum(["last_7d", "last_30d", "last_90d", "last_y"])
      .optional()
      .describe("Período relativo. Padrão last_30d."),
    dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
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
      const { assertTiktokReportAccess, fetchTiktokMetricGroups } = await import(
        "../../tiktok.server"
      );
      await assertTiktokReportAccess(userData.user.id, input.report_id);

      const groups = await fetchTiktokMetricGroups(input.report_id, {
        datePreset: input.datePreset ?? "last_30d",
        dateFrom: input.dateFrom,
        dateTo: input.dateTo,
        sortBy: input.sortBy,
      });

      const payload = {
        report_id: input.report_id,
        period: {
          datePreset: input.datePreset ?? "last_30d",
          dateFrom: input.dateFrom ?? null,
          dateTo: input.dateTo ?? null,
        },
        connected: groups.length > 0,
        note:
          groups.length > 0
            ? "Dados reais da conexão TikTok deste relatório."
            : "Nenhuma conexão TikTok vinculada a este relatório. Isso não é um erro — apenas não há TikTok conectado aqui.",
        groups,
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

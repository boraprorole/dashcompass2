import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { tool } from "ai";
import { z } from "zod";
import {
  getReportMetricsImpl,
  getTopInstagramPostsImpl,
  getInstagramAudienceImpl,
  getSearchConsoleTopImpl,
  getSearchConsoleYoYImpl,
  getSearchConsoleMonthlyYTDImpl,
  getMetaAdsCreativesImpl,
  listConnectionsImpl,
} from "./windsor.server";
import { getGaMetricsImpl, type GaMetricsRange } from "./ga.server";

export type AiProvider = "anthropic" | "openai";
export type AiMode = "general" | "windsor_analyst";

export const AI_MODELS: Record<AiProvider, { id: string; label: string }[]> = {
  anthropic: [
    { id: "claude-haiku-4-5", label: "Claude Haiku 4.5 (mais barato)" },
    { id: "claude-sonnet-4-5-20250929", label: "Claude Sonnet 4.5" },
    { id: "claude-opus-4-1-20250805", label: "Claude Opus 4.1" },
  ],
  openai: [
    { id: "gpt-4o", label: "GPT-4o" },
    { id: "gpt-4o-mini", label: "GPT-4o mini" },
    { id: "gpt-4.1", label: "GPT-4.1" },
  ],
};

export const AI_MODES: { id: AiMode; label: string; description: string }[] = [
  { id: "general", label: "Geral", description: "Assistente generalista." },
  {
    id: "windsor_analyst",
    label: "Analista Windsor",
    description: "Analista senior de social media / creator strategy, orientado a dados.",
  },
];

export async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Forbidden: admin only");
}

async function readSettingKey(key: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("app_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  return data?.value ?? null;
}

export async function getAiApiKey(provider: AiProvider): Promise<string | null> {
  const dbKey = provider === "anthropic"
    ? await readSettingKey("anthropic_api_key")
    : await readSettingKey("openai_api_key");
  if (dbKey) return dbKey;
  return provider === "anthropic"
    ? process.env.ANTHROPIC_API_KEY ?? null
    : process.env.OPENAI_API_KEY ?? null;
}

export async function getAiKeyStatusImpl(callerId: string) {
  await assertAdmin(callerId);
  const anthropic = await getAiApiKey("anthropic");
  const openai = await getAiApiKey("openai");
  const mask = (v: string | null) => (v ? `${v.slice(0, 4)}…${v.slice(-4)}` : null);
  return {
    anthropic: { hasKey: !!anthropic, masked: mask(anthropic) },
    openai: { hasKey: !!openai, masked: mask(openai) },
  };
}

export async function setAiKeyImpl(
  callerId: string,
  provider: AiProvider,
  value: string,
) {
  await assertAdmin(callerId);
  const clean = value.trim();
  if (!clean) throw new Error("Chave vazia");
  const key = provider === "anthropic" ? "anthropic_api_key" : "openai_api_key";
  const { error } = await supabaseAdmin
    .from("app_settings")
    .upsert({ key, value: clean, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function buildModel(provider: AiProvider, modelId: string) {
  const apiKey = await getAiApiKey(provider);
  if (!apiKey) {
    throw new Error(
      provider === "anthropic"
        ? "Chave Anthropic não configurada. Configure em Admin → AI."
        : "Chave OpenAI não configurada. Configure em Admin → AI.",
    );
  }
  if (provider === "anthropic") {
    return createAnthropic({ apiKey })(modelId);
  }
  return createOpenAI({ apiKey })(modelId);
}

/* ---------- System prompts per mode ---------- */

export function systemPromptFor(mode: AiMode, hasReport: boolean, reportName?: string | null) {
  const base = `Você é o Compass AI, assistente do sistema DashCompass. Responda em português do Brasil, seja objetivo, use markdown, tabelas e bullets quando ajudar. Nunca invente dados: se precisar de números, chame as ferramentas.

IMPORTANTE — memória de conversa: você SEMPRE recebe o histórico completo desta conversa (todas as mensagens anteriores do usuário, suas respostas anteriores e os resultados das ferramentas já executadas). Antes de responder ou chamar uma ferramenta, releia o histórico e:
- reutilize dados já buscados em turnos anteriores em vez de repetir a mesma chamada de ferramenta;
- mantenha coerência com decisões, filtros, períodos, empresas e relatórios já definidos pelo usuário;
- quando o usuário disser "e agora…", "compare com…", "detalhe isso", entenda como continuação do que foi discutido;
- se algo do histórico ficou ambíguo, pergunte antes de assumir.`;
  if (mode === "windsor_analyst") {
    return `${base}

Você atua como **analista senior de social media, mídia paga e SEO / creator strategy**. Seu trabalho é ler os dados do relatório do cliente e responder com insights acionáveis: hipóteses, comparações período contra período, YoY, sinais de fadiga criativa, oportunidades de escala, curadoria de conteúdo top-performer, próximos passos claros.

${hasReport
  ? `Relatório ativo: **${reportName ?? "sem nome"}**. Use as ferramentas para buscar dados desse relatório sempre que a pergunta envolver métricas concretas.`
  : `Nenhum relatório está selecionado — peça ao usuário para escolher uma empresa/relatório antes de consultar dados.`}

Ferramentas disponíveis: listar conexões Windsor, métricas do relatório (Instagram, Meta Ads, GA4, GSC etc.), top posts do Instagram, audiência do Instagram, top queries/páginas do Search Console, YoY do Search Console, série mensal YTD do Search Console, criativos Meta Ads, métricas GA4 (tráfego do site).

Ao usar dados, cite a fonte (ex: "GSC · último 30d"). Se comparar períodos, mostre variação absoluta e %.`;
  }
  return base;
}

/* ---------- Windsor tools ---------- */

const rangeShape = {
  datePreset: z
    .string()
    .describe(
      "Preset relativo aceito pelo Windsor (last_7d, last_30d, last_90d, last_y). Use isto por padrão quando a pergunta for sobre 'últimos X dias'.",
    )
    .optional(),
  dateFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .describe("Data inicial YYYY-MM-DD. Use com dateTo para períodos fixos (ex: mês passado).")
    .optional(),
  dateTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .describe("Data final YYYY-MM-DD.")
    .optional(),
};

function needsReport(reportId: string | null): reportId is null {
  return !reportId;
}

const NO_REPORT_MSG = {
  error:
    "Nenhum relatório está selecionado. Peça ao usuário para escolher uma empresa/relatório no seletor do topo do chat.",
} as const;

export function buildWindsorTools(userId: string, reportId: string | null) {
  return {
    list_windsor_connections: tool({
      description:
        "Lista as conexões Windsor.ai vinculadas ao relatório selecionado (Instagram, Meta Ads, GA4, GSC etc.).",
      inputSchema: z.object({}),
      execute: async () => {
        if (needsReport(reportId)) return NO_REPORT_MSG;
        try {
          return await listConnectionsImpl(userId, reportId);
        } catch (e) {
          return { error: (e as Error).message };
        }
      },
    }),
    get_report_metrics: tool({
      description:
        "Retorna métricas agregadas de TODAS as conexões Windsor do relatório (KPIs por conector: Instagram, Meta Ads, GA4, GSC etc.). Use para visão geral de performance.",
      inputSchema: z.object(rangeShape),
      execute: async (input) => {
        if (needsReport(reportId)) return NO_REPORT_MSG;
        try {
          return await getReportMetricsImpl(userId, reportId, input);
        } catch (e) {
          return { error: (e as Error).message };
        }
      },
    }),
    get_instagram_top_posts: tool({
      description: "Top posts do Instagram no período, ordenados por engagement/reach/likes/views.",
      inputSchema: z.object({
        ...rangeShape,
        limit: z.number().int().min(1).max(24).optional(),
        sortBy: z.enum(["engagement", "reach", "likes", "views"]).optional(),
      }),
      execute: async (input) => {
        if (needsReport(reportId)) return NO_REPORT_MSG;
        try {
          return await getTopInstagramPostsImpl(
            userId,
            reportId,
            input,
            input.limit ?? 6,
            input.sortBy ?? "engagement",
          );
        } catch (e) {
          return { error: (e as Error).message };
        }
      },
    }),
    get_instagram_audience: tool({
      description: "Audiência do Instagram: seguidores, demografia (idade/gênero/país) quando disponível.",
      inputSchema: z.object({}),
      execute: async () => {
        if (needsReport(reportId)) return NO_REPORT_MSG;
        try {
          return await getInstagramAudienceImpl(userId, reportId);
        } catch (e) {
          return { error: (e as Error).message };
        }
      },
    }),
    get_search_console_top: tool({
      description: "Top queries e páginas do Google Search Console no período.",
      inputSchema: z.object({ ...rangeShape, limit: z.number().int().min(1).max(50).optional() }),
      execute: async (input) => {
        if (needsReport(reportId)) return NO_REPORT_MSG;
        try {
          return await getSearchConsoleTopImpl(userId, reportId, input, input.limit ?? 10);
        } catch (e) {
          return { error: (e as Error).message };
        }
      },
    }),
    get_search_console_yoy: tool({
      description: "Comparativo YoY (ano vs ano anterior) para Cliques/Impressões/CTR/Posição do GSC.",
      inputSchema: z.object(rangeShape),
      execute: async (input) => {
        if (needsReport(reportId)) return NO_REPORT_MSG;
        try {
          return await getSearchConsoleYoYImpl(userId, reportId, input);
        } catch (e) {
          return { error: (e as Error).message };
        }
      },
    }),
    get_search_console_monthly_ytd: tool({
      description: "Série mensal YTD (janeiro até o mês selecionado) de Cliques e Impressões do GSC.",
      inputSchema: z.object(rangeShape),
      execute: async (input) => {
        if (needsReport(reportId)) return NO_REPORT_MSG;
        try {
          return await getSearchConsoleMonthlyYTDImpl(userId, reportId, input);
        } catch (e) {
          return { error: (e as Error).message };
        }
      },
    }),
    get_meta_ads_creatives: tool({
      description:
        "Ranking detalhado de criativos Meta Ads no período: spend, impressions, clicks, CTR, CPC, ROAS, sinais de fadiga/escala.",
      inputSchema: z.object({ ...rangeShape, limit: z.number().int().min(1).max(50).optional() }),
      execute: async (input) => {
        if (needsReport(reportId)) return NO_REPORT_MSG;
        try {
          return await getMetaAdsCreativesImpl(userId, reportId, input, input.limit ?? 20);
        } catch (e) {
          return { error: (e as Error).message };
        }
      },
    }),
    get_ga4_metrics: tool({
      description:
        "Métricas do Google Analytics 4 (GA4) do relatório: usuários ativos, sessões, engajamento, tempo médio, principais páginas e fontes de tráfego. Use quando a pergunta envolver tráfego do site, comportamento de usuários ou GA4.",
      inputSchema: z.object({
        range: z
          .enum(["7d", "28d", "90d", "thisMonth", "lastMonth"])
          .describe("Janela de tempo. Padrão: 28d.")
          .optional(),
      }),
      execute: async (input) => {
        if (needsReport(reportId)) return NO_REPORT_MSG;
        try {
          return await getGaMetricsImpl(userId, reportId, (input.range ?? "28d") as GaMetricsRange);
        } catch (e) {
          return { error: (e as Error).message };
        }
      },
    }),
  };
}

/* ---------- Report lookup ---------- */

export async function getReportName(reportId: string | null): Promise<string | null> {
  if (!reportId) return null;
  const { data } = await supabaseAdmin
    .from("reports")
    .select("title, companies(name)")
    .eq("id", reportId)
    .maybeSingle();
  if (!data) return null;
  const company = (data as { companies: { name: string } | null }).companies?.name;
  return company || data.title || null;
}

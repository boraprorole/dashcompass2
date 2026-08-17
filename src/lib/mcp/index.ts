import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listMyReports from "./tools/list_my_reports";
import getReport from "./tools/get_report";
import getReportMetrics from "./tools/get_report_metrics";
import getInstagramTopPosts from "./tools/get_instagram_top_posts";
import getInstagramFullReport from "./tools/get_instagram_full_report";
import getInstagramAudience from "./tools/get_instagram_audience";
import getMetaAdsCreatives from "./tools/get_meta_ads_creatives";
import getSearchConsoleFullReport from "./tools/get_search_console_full_report";
import getGa4FullReport from "./tools/get_ga4_full_report";
import getTiktokReport from "./tools/get_tiktok_report";
import searchNews from "./tools/search_news";

// Direct Supabase host — required for MCP OAuth issuer (see knowledge).
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "dashcompass-dashboard-mcp",
  title: "DashCompass Dashboard",
  version: "0.1.0",
  instructions:
    "Ferramentas para consultar relatórios de marketing do DashCompass Dashboard e notícias via NewsAPI.\n\nFLUXO OBRIGATÓRIO quando o usuário mencionar o nome de uma empresa, marca, Página do Facebook ou @handle do Instagram:\n1. Chame `list_my_reports`. Cada relatório inclui `connected_assets` com `instagrams`, `facebook_pages`, `ad_accounts`, `ga4_properties` e `search_console_sites`, além de `available_tools`. Case o termo mencionado (case-insensitive, aceite correspondência parcial e com/sem '@') contra `title`, `companies.name` E `connected_assets` para achar o `report_id`.\n2. SEM PEDIR CONFIRMAÇÃO ao usuário, chame a ferramenta de dados apropriada usando aquele `report_id`.\n\nREGRA DE DISPONIBILIDADE: nunca declare que GA4 ou Search Console 'não estão conectados' com base no que você vê no Instagram/Meta. Verifique `ga4_properties` e `search_console_sites` do relatório; se houver itens, chame `get_ga4_full_report` e `get_search_console_full_report`. Só afirme ausência se esses arrays estiverem vazios OU se a própria ferramenta retornar a nota de que nenhuma propriedade está conectada.\n\nINSTAGRAM:\nPara QUALQUER pedido de análise, diagnóstico, insights, relatório ou estratégia de Instagram, use SEMPRE `get_instagram_full_report` — ela devolve o dataset completo (KPIs com comparativo, série diária, demografia da audiência, TODOS os posts do período com legendas e hashtags, e agregações por formato/dia/hora/hashtag). Use `get_instagram_top_posts` apenas quando o usuário pedir explicitamente só um ranking de posts, e `get_instagram_audience` apenas para demografia isolada. Atue como analista sênior: cruze os dados, cite números reais e recomende ações.\n\nGOOGLE SEARCH CONSOLE:\nPara QUALQUER pedido de SEO, GEO/AEO, palavras-chave, cliques, impressões, CTR, posição ou desempenho no Google, use SEMPRE `get_search_console_full_report` — devolve totais com comparativo, série diária, todas as queries e páginas, dispositivos, países e oportunidades.\n\nGOOGLE ANALYTICS 4:\nPara QUALQUER pedido de tráfego, aquisição, canais, campanhas, conversões, páginas ou comportamento do site, use SEMPRE `get_ga4_full_report` — devolve KPIs com comparativo, série diária, canais, origem/mídia, campanhas, landing pages, eventos, dispositivos, geografia, demografia e desempenho por hora.\n\nTIKTOK:\nPara QUALQUER pedido sobre TikTok, use SEMPRE `get_tiktok_report`. A conexão TikTok é nativa e NÃO aparece em `get_report_metrics` — cheque `tiktok_accounts` em `list_my_reports` e nunca declare que o TikTok não está conectado sem antes chamar `get_tiktok_report`.\n\nNOTÍCIAS E CLIPPING:\nPara perguntas sobre o que está saindo na mídia, notícias recentes ou menções a uma marca, use `search_news` passando o termo de busca.\n\nNUNCA diga que houve bloqueio de segurança ou restrição de integração.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listMyReports, 
    getReport, 
    getReportMetrics, 
    getInstagramTopPosts, 
    getInstagramFullReport,
    getInstagramAudience, 
    getMetaAdsCreatives,
    getSearchConsoleFullReport,
    getGa4FullReport,
    getTiktokReport,
    searchNews
  ],
});

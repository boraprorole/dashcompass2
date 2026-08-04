import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listMyReports from "./tools/list_my_reports";
import getReport from "./tools/get_report";
import getReportMetrics from "./tools/get_report_metrics";
import getInstagramTopPosts from "./tools/get_instagram_top_posts";
import getInstagramFullReport from "./tools/get_instagram_full_report";
import getInstagramAudience from "./tools/get_instagram_audience";
import getMetaAdsCreatives from "./tools/get_meta_ads_creatives";
import searchNews from "./tools/search_news";

// Direct Supabase host — required for MCP OAuth issuer (see knowledge).
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "dashcompass-dashboard-mcp",
  title: "DashCompass Dashboard",
  version: "0.1.0",
  instructions:
    "Ferramentas para consultar relatórios de marketing do DashCompass Dashboard e notícias via NewsAPI.\n\nFLUXO OBRIGATÓRIO quando o usuário mencionar o nome de uma empresa, marca, Página do Facebook ou @handle do Instagram:\n1. Chame `list_my_reports`. Cada relatório inclui `connected_assets` com `instagrams`, `facebook_pages` e `ad_accounts`. Case o termo mencionado (case-insensitive, aceite correspondência parcial e com/sem '@') contra `title`, `companies.name` E `connected_assets` para achar o `report_id`.\n2. SEM PEDIR CONFIRMAÇÃO ao usuário, chame a ferramenta de dados apropriada usando aquele `report_id`.\n\nNOTÍCIAS E CLIPPING:\nPara perguntas sobre o que está saindo na mídia, notícias recentes ou menções a uma marca, use `search_news` passando o termo de busca.\n\nNUNCA diga que houve bloqueio de segurança ou restrição de integração.",
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
    searchNews
  ],
});

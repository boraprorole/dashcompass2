# Google Ads via CSV — UNORTE (e qualquer empresa)

Upload manual de relatórios de Google Ads no admin da empresa, com visualização automática na aba "Google Ads" do relatório.

## Banco

Duas tabelas novas:

**`google_ads_datasets`** — um upload = um dataset
- `id` uuid pk
- `company_id` uuid → companies
- `period_label` text (ex: "1 de junho de 2024 - 1 de junho de 2025")
- `period_start` date, `period_end` date (parseados do CSV)
- `currency` text (default BRL)
- `source_filename` text
- `uploaded_by` uuid, `created_at` timestamptz

**`google_ads_campaigns`** — linhas do CSV
- `id`, `dataset_id` (fk cascade)
- `campaign_name`, `status`, `campaign_type`
- `clicks` int, `impressions` int, `ctr` numeric
- `avg_cpc` numeric, `cost` numeric
- `top_impression_share` numeric, `abs_top_impression_share` numeric
- `conversions` numeric, `view_conversions` numeric
- `cost_per_conv` numeric, `conv_rate` numeric

RLS: admin gerencia; usuário lê datasets de empresas cujos relatórios ele tem acesso (via reports.user_id / vínculos existentes).

## Backend (`src/lib/googleAds.functions.ts` + `.server.ts`)

- `uploadGoogleAdsCsv({ companyId, filename, csvText })` — admin only. Parse do CSV (formato com header nas linhas 1–3), extrai período, cria dataset + campanhas em transação. Trata números BR ("1.692,17" → 1692.17). Idempotência por `(company_id, period_label)`: substitui se já existir.
- `listGoogleAdsDatasets({ companyId })` — lista datasets ordenados por período.
- `deleteGoogleAdsDataset({ id })` — admin only.
- `getGoogleAdsForReport({ reportId })` — retorna todos os datasets da empresa do relatório com campanhas agregadas.

## Admin (dentro do card da empresa, junto com "Vincular contas")

Nova seção **"Google Ads (CSV)"**:
- Botão "Enviar CSV"
- Lista de datasets já enviados (período, nº de campanhas, custo total, botão excluir)

## Relatório (aba nova "Google Ads")

Em `ReportMetricsPanel.tsx`, adicionar aba visível quando `getGoogleAdsForReport` retorna ≥1 dataset:

- **Seletor de período**: um dropdown com os datasets disponíveis + opção "Comparar dois períodos"
- **KPIs (topo)**: Cliques, Impressões, CTR médio ponderado, Custo total, Conversões, CPL médio (custo/conversões), CPC médio
- **Comparativo YoY**: se 2 datasets selecionados, cards mostram Δ% (verde/vermelho) para cada KPI
- **Gráfico de barras** (recharts, já instalado): Top 10 campanhas por custo, com barra dupla custo x conversões
- **Tabela**: todas as campanhas filtráveis por status (Ativa/Pausada/Removida), sortable por qualquer coluna, campanhas com 0 impressões escondidas por default (toggle "Mostrar inativas")

## Import inicial

Depois de aprovado o plano, faço upload direto no banco dos dois CSVs anexados (jun/24–jul/25 e jun/25–jul/26) vinculados à empresa UNORTE, para você já ver funcionando.

## Fora de escopo

- Conexão OAuth com Google Ads API (fica pra depois se quiser automatizar)
- Edição inline de linhas do CSV (re-upload substitui o dataset)

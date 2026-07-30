import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "admin_global", "admin_agencia"])
    .limit(1)
    .maybeSingle();
  if (!data) throw new Error("Forbidden: admin only");
}

async function getReportCompanyId(reportId: string): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from("reports")
    .select("company_id")
    .eq("id", reportId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.company_id) throw new Error("Relatório sem empresa vinculada");
  return data.company_id;
}

// --- CSV Parsing helpers ---

function detectDelimiter(sample: string): string {
  const line = sample.split(/\r?\n/).find((l) => l.trim().length > 0) ?? "";
  const counts = [",", ";", "\t"].map((d) => ({ d, n: (line.match(new RegExp(`\\${d}`, "g")) ?? []).length }));
  counts.sort((a, b) => b.n - a.n);
  return counts[0].n > 0 ? counts[0].d : ",";
}

function parseCsv(text: string, delim: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === delim) { row.push(field); field = ""; }
      else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
      else if (c === "\r") { /* skip */ }
      else field += c;
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((v) => v && v.trim().length > 0));
}

function parseNumberBR(v: string | undefined): number {
  if (v == null) return 0;
  let s = String(v).trim();
  if (!s || s === "--" || s === "-") return 0;
  // Remove currency symbols and % and spaces
  s = s.replace(/R\$|\$|€|%/g, "").replace(/\s/g, "").replace(/\u00a0/g, "");
  // Detect BR format: contains "," → treat "." as thousands and "," as decimal
  if (s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function norm(h: string): string {
  return h
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function findCol(headers: string[], candidates: string[]): number {
  const normed = headers.map(norm);
  for (const c of candidates) {
    const nc = norm(c);
    const idx = normed.findIndex((h) => h === nc);
    if (idx >= 0) return idx;
  }
  // fallback: contains
  for (const c of candidates) {
    const nc = norm(c);
    const idx = normed.findIndex((h) => h.includes(nc));
    if (idx >= 0) return idx;
  }
  return -1;
}

export type CsvRow = {
  campaign_name: string;
  status: string | null;
  campaign_type: string | null;
  clicks: number;
  impressions: number;
  ctr: number;
  avg_cpc: number;
  cost: number;
  conversions: number;
  view_conversions: number;
  cost_per_conv: number;
  conv_rate: number;
};

export function parseGoogleAdsCsv(text: string): { rows: CsvRow[]; currency: string } {
  // Google Ads exports often have a "Google Ads" banner + blank lines at top; find header row
  const lines = text.split(/\r?\n/);
  // Find first non-empty line that looks like header (contains "Campanha" or "Campaign")
  let headerIdx = 0;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].toLowerCase();
    if (l.includes("campanha") || l.includes("campaign")) { headerIdx = i; break; }
  }
  const body = lines.slice(headerIdx).join("\n");
  const delim = detectDelimiter(body);
  const rows = parseCsv(body, delim);
  if (rows.length < 2) return { rows: [], currency: "BRL" };
  const headers = rows[0];

  const iName = findCol(headers, ["Campanha", "Campaign"]);
  const iStatus = findCol(headers, ["Status da campanha", "Status", "Campaign status"]);
  const iType = findCol(headers, ["Tipo de campanha", "Campaign type", "Tipo"]);
  const iClicks = findCol(headers, ["Cliques", "Clicks"]);
  const iImpr = findCol(headers, ["Impr.", "Impressoes", "Impressões", "Impressions", "Impr"]);
  const iCtr = findCol(headers, ["CTR"]);
  const iCpc = findCol(headers, ["CPC medio", "CPC médio", "CPC med.", "Avg. CPC", "Average CPC"]);
  const iCost = findCol(headers, ["Custo", "Cost"]);
  const iConv = findCol(headers, ["Conversoes", "Conversões", "Conversions"]);
  const iView = findCol(headers, ["Conv. de visualização", "Conv. de visualizacao", "View-through conversions", "Conv. por visualizacao"]);
  const iCpa = findCol(headers, ["Custo/conv.", "Custo por conv.", "Cost/conv.", "Cost / conv."]);
  const iRate = findCol(headers, ["Taxa de conv.", "Taxa de conversão", "Conv. rate"]);

  const out: CsvRow[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const name = (iName >= 0 ? row[iName] : "").trim();
    if (!name) continue;
    // Skip summary rows
    const low = name.toLowerCase();
    if (low.startsWith("total") || low.includes("total geral")) continue;
    out.push({
      campaign_name: name,
      status: iStatus >= 0 ? row[iStatus]?.trim() || null : null,
      campaign_type: iType >= 0 ? row[iType]?.trim() || null : null,
      clicks: Math.round(parseNumberBR(row[iClicks])),
      impressions: Math.round(parseNumberBR(row[iImpr])),
      ctr: parseNumberBR(row[iCtr]),
      avg_cpc: parseNumberBR(row[iCpc]),
      cost: parseNumberBR(row[iCost]),
      conversions: parseNumberBR(row[iConv]),
      view_conversions: parseNumberBR(row[iView]),
      cost_per_conv: parseNumberBR(row[iCpa]),
      conv_rate: parseNumberBR(row[iRate]),
    });
  }
  // Detect currency (default BRL)
  const currency = /R\$/.test(text) ? "BRL" : /US\$|\$/.test(text) ? "USD" : "BRL";
  return { rows: out, currency };
}

// --- Public API ---

export async function uploadGoogleAdsCsvImpl(
  callerId: string,
  reportId: string,
  periodLabel: string,
  csvText: string,
  filename: string | null,
  periodStart: string | null,
  periodEnd: string | null,
) {
  await assertAdmin(callerId);
  const companyId = await getReportCompanyId(reportId);
  const { rows, currency } = parseGoogleAdsCsv(csvText);
  if (rows.length === 0) throw new Error("Nenhuma campanha encontrada no CSV. Verifique o arquivo.");

  // Upsert dataset
  const { data: existing } = await supabaseAdmin
    .from("google_ads_datasets")
    .select("id")
    .eq("company_id", companyId)
    .eq("period_label", periodLabel)
    .maybeSingle();

  let datasetId = existing?.id as string | undefined;
  if (datasetId) {
    const { error } = await supabaseAdmin
      .from("google_ads_datasets")
      .update({
        source_filename: filename,
        period_start: periodStart,
        period_end: periodEnd,
        currency,
        uploaded_by: callerId,
      })
      .eq("id", datasetId);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("google_ads_campaigns").delete().eq("dataset_id", datasetId);
  } else {
    const { data, error } = await supabaseAdmin
      .from("google_ads_datasets")
      .insert({
        company_id: companyId,
        period_label: periodLabel,
        period_start: periodStart,
        period_end: periodEnd,
        currency,
        source_filename: filename,
        uploaded_by: callerId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    datasetId = data.id;
  }

  const inserts = rows.map((r) => ({ dataset_id: datasetId, ...r }));
  const { error: insErr } = await supabaseAdmin.from("google_ads_campaigns").insert(inserts);
  if (insErr) throw new Error(insErr.message);
  return { datasetId, rows: rows.length };
}

export async function listGoogleAdsDatasetsImpl(reportId: string) {
  const companyId = await getReportCompanyId(reportId);
  const { data, error } = await supabaseAdmin
    .from("google_ads_datasets")
    .select("id, period_label, period_start, period_end, currency, source_filename, created_at, updated_at")
    .eq("company_id", companyId)
    .order("period_start", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getGoogleAdsDatasetImpl(datasetId: string) {
  const { data: ds, error } = await supabaseAdmin
    .from("google_ads_datasets")
    .select("id, company_id, period_label, period_start, period_end, currency, source_filename, created_at")
    .eq("id", datasetId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!ds) throw new Error("Dataset não encontrado");
  const { data: campaigns, error: cErr } = await supabaseAdmin
    .from("google_ads_campaigns")
    .select("*")
    .eq("dataset_id", datasetId)
    .order("cost", { ascending: false });
  if (cErr) throw new Error(cErr.message);
  return { dataset: ds, campaigns: campaigns ?? [] };
}

export async function deleteGoogleAdsDatasetImpl(callerId: string, datasetId: string) {
  await assertAdmin(callerId);
  const { error } = await supabaseAdmin.from("google_ads_datasets").delete().eq("id", datasetId);
  if (error) throw new Error(error.message);
  return { ok: true };
}

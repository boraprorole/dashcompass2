import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(callerId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", callerId)
    .in("role", ["admin", "admin_global", "admin_agencia"]);
  
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Forbidden: admin only");
}

export type AdminReportSection = {
  id: string;
  report_id: string;
  title: string;
  embed_code: string | null;
  position: number;
};

export async function listReportsAdminImpl(callerId: string) {
  await assertAdmin(callerId);

  // Buscar os papéis do usuário para determinar o escopo
  const { data: roles } = await supabaseAdmin
    .from("user_roles")
    .select("role, agency_id")
    .eq("user_id", callerId);

  const isAdminGlobal = roles?.some(r => r.role === "admin_global");
  const agencyId = roles?.find(r => r.agency_id)?.agency_id;

  const query = supabaseAdmin
    .from("reports")
    .select("id, title, description, url, embed_code, logo_url, created_at, company_id, companies(name, agency_id)");

  // Se não for admin global, filtrar por agência
  if (!isAdminGlobal && agencyId) {
    query.eq("agency_id", agencyId);
  }

  const { data: reports, error } = await query.order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const { data: sections } = await supabaseAdmin
    .from("report_sections")
    .select("id, report_id, title, embed_code, position")
    .order("position", { ascending: true });

  const sectionMap = new Map<string, AdminReportSection[]>();
  (sections ?? []).forEach((s) => {
    const arr = sectionMap.get(s.report_id) ?? [];
    arr.push(s as AdminReportSection);
    sectionMap.set(s.report_id, arr);
  });

  return (reports ?? []).map((r) => ({
    ...r,
    assignedUserIds: [],
    sections: sectionMap.get(r.id) ?? [],
  }));
}

export async function createReportImpl(
  callerId: string,
  input: { 
    title?: string; 
    company_id?: string | null; 
    description?: string | null; 
    url?: string | null; 
    embed_code?: string | null; 
    logo_url?: string | null;
    agency_id?: string | null;
  },
) {
  await assertAdmin(callerId);
  const { data, error } = await supabaseAdmin
    .from("reports")
    .insert({
      title: input.title || "",
      company_id: input.company_id || null,
      description: input.description ?? null,
      url: input.url ?? null,
      embed_code: input.embed_code ?? null,
      logo_url: input.logo_url ?? null,
      created_by: callerId,
      agency_id: input.agency_id ?? null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  // Inserir automaticamente o agency_id da empresa se não fornecido
  if (input.company_id && !input.agency_id) {
    const { data: company } = await supabaseAdmin
      .from("companies")
      .select("agency_id")
      .eq("id", input.company_id)
      .single();
    
    if (company?.agency_id) {
      await supabaseAdmin
        .from("reports")
        .update({ agency_id: company.agency_id })
        .eq("id", data.id);
    }
  }

  return { id: data.id };
}

export async function updateReportImpl(
  callerId: string,
  input: { id: string; title?: string; company_id?: string | null; description?: string | null; url?: string | null; embed_code?: string | null; logo_url?: string | null },
) {
  await assertAdmin(callerId);
  const { error } = await supabaseAdmin
    .from("reports")
    .update({
      title: input.title || "",
      company_id: input.company_id || null,
      description: input.description ?? null,
      url: input.url ?? null,
      embed_code: input.embed_code ?? null,
      logo_url: input.logo_url ?? null,
    })
    .eq("id", input.id);
  if (error) throw new Error(error.message);
  return { ok: true };
}


export async function deleteReportImpl(callerId: string, reportId: string) {
  await assertAdmin(callerId);
  const { error } = await supabaseAdmin.from("reports").delete().eq("id", reportId);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function setReportAssignmentImpl(
  callerId: string,
  _reportId: string,
  _userId: string,
  _assigned: boolean,
) {
  await assertAdmin(callerId);
  // Esta função não é mais necessária pois o vínculo é feito via Empresa
  return { ok: true };
}

/* ----- Sections ----- */

export async function createSectionImpl(
  callerId: string,
  input: { reportId: string; title: string; embed_code: string | null },
) {
  await assertAdmin(callerId);
  const { data: maxRow } = await supabaseAdmin
    .from("report_sections")
    .select("position")
    .eq("report_id", input.reportId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextPos = (maxRow?.position ?? -1) + 1;

  const { data, error } = await supabaseAdmin
    .from("report_sections")
    .insert({
      report_id: input.reportId,
      title: input.title,
      embed_code: input.embed_code,
      position: nextPos,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return { id: data.id };
}

export async function updateSectionImpl(
  callerId: string,
  input: { id: string; title: string; embed_code: string | null },
) {
  await assertAdmin(callerId);
  const { error } = await supabaseAdmin
    .from("report_sections")
    .update({ title: input.title, embed_code: input.embed_code })
    .eq("id", input.id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function deleteSectionImpl(callerId: string, id: string) {
  await assertAdmin(callerId);
  const { error } = await supabaseAdmin.from("report_sections").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

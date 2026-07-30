import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: role } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "admin_global", "admin_agencia"])
    .limit(1)
    .maybeSingle();
  if (!role) throw new Error("Forbidden: admin only");
}

export const startPipedriveOAuth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ reportId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { buildPipedriveAuthUrl } = await import("@/lib/pipedrive.server");
    const url = await buildPipedriveAuthUrl(data.reportId, context.userId);
    return { url };
  });

export const listPipedriveConnections = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ reportId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { listPipedriveConnectionsImpl } = await import("@/lib/pipedrive.server");
    return listPipedriveConnectionsImpl(data.reportId);
  });

export const deletePipedriveConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { deletePipedriveConnectionImpl } = await import("@/lib/pipedrive.server");
    return deletePipedriveConnectionImpl(data.id);
  });

export const getPipedriveCrmMetrics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        reportId: z.string().uuid(),
        dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { data: report, error } = await context.supabase
      .from("reports")
      .select("id")
      .eq("id", data.reportId)
      .maybeSingle();
    if (error || !report) throw new Error("Relatório não encontrado ou sem acesso.");
    const { getPipedriveCrmMetricsImpl } = await import("@/lib/pipedrive.server");
    return getPipedriveCrmMetricsImpl(context.userId, data.reportId, data.dateFrom, data.dateTo);
  });

export const hasPipedriveConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ reportId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const { data: report, error } = await context.supabase
      .from("reports")
      .select("id")
      .eq("id", data.reportId)
      .maybeSingle();
    if (error || !report) return { connected: false as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin
      .from("pipedrive_connections")
      .select("id")
      .eq("report_id", data.reportId)
      .limit(1);
    return { connected: (rows?.length ?? 0) > 0 };
  });



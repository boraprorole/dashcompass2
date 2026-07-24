import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CLIENT_ID_KEY = "rdstation_client_id";
const CLIENT_SECRET_KEY = "rdstation_client_secret";

async function assertAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: role } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!role) throw new Error("Forbidden: admin only");
}

export const getRDStationCredentials = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("app_settings")
      .select("key,value")
      .in("key", [CLIENT_ID_KEY, CLIENT_SECRET_KEY]);
    const map = new Map((data ?? []).map((r) => [r.key, r.value ?? ""]));
    const clientId = map.get(CLIENT_ID_KEY) ?? "";
    const clientSecret = map.get(CLIENT_SECRET_KEY) ?? "";
    return {
      clientId,
      hasClientSecret: clientSecret.length > 0,
      clientSecretPreview: clientSecret ? `••••${clientSecret.slice(-4)}` : "",
    };
  });

export const setRDStationCredentials = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        clientId: z.string().trim().min(1).max(256),
        clientSecret: z.string().trim().min(1).max(512).optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const rows: Array<{ key: string; value: string; updated_at: string }> = [
      { key: CLIENT_ID_KEY, value: data.clientId, updated_at: new Date().toISOString() },
    ];
    if (data.clientSecret) {
      rows.push({
        key: CLIENT_SECRET_KEY,
        value: data.clientSecret,
        updated_at: new Date().toISOString(),
      });
    }
    const { error } = await supabaseAdmin.from("app_settings").upsert(rows);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// -- OAuth per-report connections --

export const startRDStationOAuth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ reportId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { buildRdAuthUrl } = await import("@/lib/rdstation.server");
    const url = await buildRdAuthUrl(data.reportId, context.userId);
    return { url };
  });

export const listRDStationConnections = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ reportId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { listRdConnectionsImpl } = await import("@/lib/rdstation.server");
    return listRdConnectionsImpl(data.reportId);
  });

export const deleteRDStationConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { deleteRdConnectionImpl } = await import("@/lib/rdstation.server");
    return deleteRdConnectionImpl(data.id);
  });

export const updateRDStationConnectionSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        show_conversions: z.boolean().optional(),
        show_emails: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { updateRdConnectionSettingsImpl } = await import("@/lib/rdstation.server");
    const { id, ...patch } = data;
    return updateRdConnectionSettingsImpl(id, patch);
  });


export const getRDStationMetrics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        reportId: z.string().uuid(),
        range: z.enum(["7d", "28d", "90d", "thisMonth", "lastMonth"]).default("28d"),
        customDates: z
          .object({ start_date: z.string(), end_date: z.string() })
          .optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { getRdMetricsImpl } = await import("@/lib/rdstation.server");
    return getRdMetricsImpl(data.reportId, data.range, data.customDates);
  });

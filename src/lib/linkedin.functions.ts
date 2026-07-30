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

export const startLinkedInOAuth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ reportId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { buildLinkedInAuthUrl } = await import("@/lib/linkedin.server");
    const url = await buildLinkedInAuthUrl(data.reportId, context.userId);
    return { url };
  });

export const listLinkedInConnections = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ reportId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { listLinkedInConnectionsImpl } = await import("@/lib/linkedin.server");
    return listLinkedInConnectionsImpl(data.reportId);
  });

export const deleteLinkedInConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { deleteLinkedInConnectionImpl } = await import("@/lib/linkedin.server");
    return deleteLinkedInConnectionImpl(data.id);
  });

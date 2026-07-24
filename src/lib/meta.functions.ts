import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const startMetaOAuth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ reportId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const { assertCanManageReport, buildMetaAuthUrl } = await import("@/lib/meta.server");
    await assertCanManageReport(context.userId, data.reportId);
    const url = await buildMetaAuthUrl(data.reportId, context.userId);
    return { url };
  });

export const listMetaConnections = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ reportId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const { listMetaConnectionsImpl } = await import("@/lib/meta.server");
    return listMetaConnectionsImpl(context.userId, data.reportId);
  });

export const deleteMetaConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const { deleteMetaConnectionImpl } = await import("@/lib/meta.server");
    return deleteMetaConnectionImpl(context.userId, data.id);
  });

export const updateMetaConnectionSelection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        selection: z.object({
          pages: z.array(z.string()),
          instagrams: z.array(z.string()),
          ad_accounts: z.array(z.string()),
        }),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { updateMetaConnectionSelectionImpl } = await import("@/lib/meta.server");
    return updateMetaConnectionSelectionImpl(context.userId, data.id, data.selection);
  });


// Lista relatórios que o usuário atual consegue acessar (RLS aplica).
// Usado na página /conexoes para escolher onde vincular a conta Meta.
export const listAccessibleReports = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("reports")
      .select("id, title, companies(name)")
      .order("title", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({
      id: r.id,
      title: r.title,
      company_name: (r as { companies?: { name?: string | null } | null }).companies?.name ?? null,
    }));
  });

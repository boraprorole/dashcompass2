import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const startInstagramLoginOAuth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ reportId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const { assertCanManageReport } = await import("@/lib/meta.server");
    const { buildInstagramAuthUrl } = await import("@/lib/instagram_login.server");
    await assertCanManageReport(context.userId, data.reportId);
    const url = await buildInstagramAuthUrl(data.reportId, context.userId);
    return { url };
  });

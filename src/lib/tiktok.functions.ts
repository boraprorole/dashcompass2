import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const startTiktokOAuth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ reportId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const { buildTiktokAuthUrl } = await import("./tiktok.server");
    const url = await buildTiktokAuthUrl({ reportId: data.reportId, userId: context.userId });
    return { url };
  });

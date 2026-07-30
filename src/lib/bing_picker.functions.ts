import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listBingSites = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ reportId: z.string() }).parse(data))
  .handler(async ({ data }) => {
    const { listBingSites: listSites } = await import("./bing_picker.server");
    return await listSites(data.reportId);
  });

export const chooseBingSite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ reportId: z.string(), siteUrl: z.string() }).parse(data))
  .handler(async ({ data }) => {
    const { chooseBingSite: chooseSite } = await import("./bing_picker.server");
    return await chooseSite(data.reportId, data.siteUrl);
  });

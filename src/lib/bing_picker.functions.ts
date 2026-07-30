import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listBingSites = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ reportId: z.string() }).parse(data))
  .handler(async ({ data }) => {
    try {
      const { listBingSites: listSites } = await import("./bing_picker.server");
      const result = await listSites(data.reportId);
      return { error: false as const, ...result };
    } catch (err) {
      // Never let this throw — a thrown error here can get mangled into an
      // HTML 500 page by the SSR layer instead of JSON, which breaks the
      // client's JSON.parse(). Always return a normal 200 response instead,
      // with an error flag the client checks explicitly.
      const message = err instanceof Error ? err.message : "Erro desconhecido ao buscar sites do Bing";
      console.error("[listBingSites] falhou:", err);
      return { error: true as const, message, sites: [], current: undefined };
    }
  });

export const chooseBingSite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ reportId: z.string(), siteUrl: z.string() }).parse(data))
  .handler(async ({ data }) => {
    try {
      const { chooseBingSite: chooseSite } = await import("./bing_picker.server");
      const result = await chooseSite(data.reportId, data.siteUrl);
      return { error: false as const, ...result };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido ao selecionar site do Bing";
      console.error("[chooseBingSite] falhou:", err);
      return { error: true as const, message };
    }
  });

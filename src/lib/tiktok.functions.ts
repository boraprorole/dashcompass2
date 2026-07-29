import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const startTiktokOAuth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ reportId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const { assertTiktokReportAccess, buildTiktokAuthUrl } = await import("./tiktok.server");
    await assertTiktokReportAccess(context.userId, data.reportId);
    const url = await buildTiktokAuthUrl({ reportId: data.reportId, userId: context.userId });
    return { url };
  });

export const getReportTiktokMetrics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        reportId: z.string().uuid(),
        datePreset: z.string().max(32).optional(),
        dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        sortBy: z.enum(["engagement", "reach", "likes", "views"]).optional(),

      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { assertTiktokReportAccess, fetchTiktokMetricGroups } = await import("./tiktok.server");
    await assertTiktokReportAccess(context.userId, data.reportId);
    return fetchTiktokMetricGroups(data.reportId, {
      datePreset: data.datePreset,
      dateFrom: data.dateFrom,
      dateTo: data.dateTo,
      sortBy: data.sortBy,

    });
  });

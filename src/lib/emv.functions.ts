import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getReportEmvImpl } from "./emv.server";

const rangeSchema = z.object({
  datePreset: z.string().max(32).optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const getReportEmv = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ reportId: z.string().uuid() }).merge(rangeSchema).parse(input),
  )
  .handler(async ({ context, data }) =>
    getReportEmvImpl(context.userId, data.reportId, {
      datePreset: data.datePreset,
      dateFrom: data.dateFrom,
      dateTo: data.dateTo,
    }),
  );

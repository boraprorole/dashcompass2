import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  uploadGoogleAdsCsvImpl,
  listGoogleAdsDatasetsImpl,
  getGoogleAdsDatasetImpl,
  deleteGoogleAdsDatasetImpl,
} from "./googleads-csv.server";

export const uploadGoogleAdsCsv = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        reportId: z.string().uuid(),
        periodLabel: z.string().min(1).max(120),
        csvText: z.string().min(10).max(10 * 1024 * 1024),
        filename: z.string().max(255).nullable().optional(),
        periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
        periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) =>
    uploadGoogleAdsCsvImpl(
      context.userId,
      data.reportId,
      data.periodLabel,
      data.csvText,
      data.filename ?? null,
      data.periodStart ?? null,
      data.periodEnd ?? null,
    ),
  );

export const listGoogleAdsDatasets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ reportId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => listGoogleAdsDatasetsImpl(data.reportId));

export const getGoogleAdsDataset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ datasetId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => getGoogleAdsDatasetImpl(data.datasetId));

export const deleteGoogleAdsDataset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ datasetId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => deleteGoogleAdsDatasetImpl(context.userId, data.datasetId));

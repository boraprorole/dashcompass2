import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  buildAuthUrl,
  deleteGaConnectionImpl,
  getGaMetricsImpl,
  listGaAccountPropertiesImpl,
  listGaConnectionsImpl,
  updateGaConnectionImpl,
  type GaMetricsRange,
} from "./ga.server";

export const startGaOAuth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ reportId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const req = getRequest();
    const origin = new URL(req.url).origin;
    const url = await buildAuthUrl({ origin, reportId: data.reportId, userId: context.userId });
    return { url };
  });

export const listGaConnections = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ reportId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => listGaConnectionsImpl(context.userId, data.reportId));

export const listGaAccountProperties = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ connectionId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) =>
    listGaAccountPropertiesImpl(context.userId, data.connectionId),
  );

export const updateGaConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        ga_property_id: z.string().min(1).optional(),
        label: z.string().max(200).optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { id, ...patch } = data;
    return updateGaConnectionImpl(context.userId, id, patch);
  });

export const deleteGaConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => deleteGaConnectionImpl(context.userId, data.id));

export const getGaMetrics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        reportId: z.string().uuid(),
        range: z.enum(["7d", "28d", "90d", "thisMonth", "lastMonth"]).optional(),
        dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) =>
    getGaMetricsImpl(
      context.userId,
      data.reportId,
      (data.range ?? "28d") as GaMetricsRange,
      data.dateFrom && data.dateTo ? { startDate: data.dateFrom, endDate: data.dateTo } : undefined,
    ),
  );

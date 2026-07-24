import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  SUPPORTED_CONNECTORS,
  listWindsorAccountsImpl,
  listConnectionsImpl,
  addConnectionImpl,
  deleteConnectionImpl,
  getReportMetricsImpl,
  getTopInstagramPostsImpl,
  getInstagramAudienceImpl,
  getSearchConsoleTopImpl,
  getSearchConsoleYoYImpl,
  getSearchConsoleMonthlyYTDImpl,
  getWindsorKeyStatusImpl,
  setWindsorKeyImpl,
  clearWindsorCacheImpl,
  getMetaAdsCreativesImpl,
} from "./windsor.server";

export const supportedConnectors = SUPPORTED_CONNECTORS;

export const listWindsorAccounts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ connector: z.string().min(1).max(64) }).parse(input))
  .handler(async ({ context, data }) => listWindsorAccountsImpl(context.userId, data.connector));

export const listReportWindsorConnections = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ reportId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => listConnectionsImpl(context.userId, data.reportId));

export const addReportWindsorConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      reportId: z.string().uuid(),
      connector: z.string().min(1).max(64),
      account_id: z.string().min(1).max(128),
      account_name: z.string().max(256).nullable().optional(),
    }).parse(input),
  )
  .handler(async ({ context, data }) =>
    addConnectionImpl(context.userId, {
      reportId: data.reportId,
      connector: data.connector,
      account_id: data.account_id,
      account_name: data.account_name ?? null,
    }),
  );

export const deleteReportWindsorConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => deleteConnectionImpl(context.userId, data.id));

const rangeSchema = z.object({
  datePreset: z.string().max(32).optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const getReportWindsorMetrics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ reportId: z.string().uuid() }).merge(rangeSchema).parse(input),
  )
  .handler(async ({ context, data }) =>
    getReportMetricsImpl(context.userId, data.reportId, {
      datePreset: data.datePreset,
      dateFrom: data.dateFrom,
      dateTo: data.dateTo,
    }),
  );

export const getReportInstagramTopPosts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        reportId: z.string().uuid(),
        limit: z.number().int().min(1).max(24).optional(),
        sortBy: z.enum(["engagement", "reach", "likes", "views"]).optional(),
      })
      .merge(rangeSchema)
      .parse(input),
  )
  .handler(async ({ context, data }) =>
    getTopInstagramPostsImpl(
      context.userId,
      data.reportId,
      { datePreset: data.datePreset, dateFrom: data.dateFrom, dateTo: data.dateTo },
      data.limit ?? 6,
      data.sortBy ?? "engagement",
    ),
  );

export const getReportInstagramAudience = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ reportId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => getInstagramAudienceImpl(context.userId, data.reportId));

export const getReportSearchConsoleTop = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        reportId: z.string().uuid(),
        limit: z.number().int().min(1).max(50).optional(),
      })
      .merge(rangeSchema)
      .parse(input),
  )
  .handler(async ({ context, data }) =>
    getSearchConsoleTopImpl(
      context.userId,
      data.reportId,
      { datePreset: data.datePreset, dateFrom: data.dateFrom, dateTo: data.dateTo },
      data.limit ?? 10,
    ),
  );

export const getReportSearchConsoleYoY = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ reportId: z.string().uuid() }).merge(rangeSchema).parse(input),
  )
  .handler(async ({ context, data }) =>
    getSearchConsoleYoYImpl(
      context.userId,
      data.reportId,
      { datePreset: data.datePreset, dateFrom: data.dateFrom, dateTo: data.dateTo },
    ),
  );

export const getReportSearchConsoleMonthlyYTD = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ reportId: z.string().uuid() }).merge(rangeSchema).parse(input),
  )
  .handler(async ({ context, data }) =>
    getSearchConsoleMonthlyYTDImpl(
      context.userId,
      data.reportId,
      { datePreset: data.datePreset, dateFrom: data.dateFrom, dateTo: data.dateTo },
    ),
  );




export const getWindsorKeyStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => getWindsorKeyStatusImpl(context.userId));

export const setWindsorKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ value: z.string().min(4).max(512) }).parse(input))
  .handler(async ({ context, data }) => setWindsorKeyImpl(context.userId, data.value));

export const clearWindsorCache = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => clearWindsorCacheImpl(context.userId));

export const getReportMetaAdsCreatives = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        reportId: z.string().uuid(),
        limit: z.number().int().min(1).max(50).optional(),
      })
      .merge(rangeSchema)
      .parse(input),
  )
  .handler(async ({ context, data }) =>
    getMetaAdsCreativesImpl(
      context.userId,
      data.reportId,
      { datePreset: data.datePreset, dateFrom: data.dateFrom, dateTo: data.dateTo },
      data.limit ?? 20,
    ),
  );

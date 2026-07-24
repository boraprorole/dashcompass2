import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  listGa4PropertiesForReport,
  setGa4Property,
  listGscSitesForReport,
  setGscSite,
  listGoogleAdsCustomersForReport,
  setGoogleAdsCustomer,
} from "./google_picker.server";

const reportOnly = z.object({ reportId: z.string().uuid() });

export const listGa4Properties = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => reportOnly.parse(input))
  .handler(async ({ context, data }) => listGa4PropertiesForReport(context.userId, data.reportId));

export const chooseGa4Property = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ reportId: z.string().uuid(), propertyId: z.string().min(1) }).parse(input),
  )
  .handler(async ({ context, data }) => setGa4Property(context.userId, data.reportId, data.propertyId));

export const listGscSites = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => reportOnly.parse(input))
  .handler(async ({ context, data }) => listGscSitesForReport(context.userId, data.reportId));

export const chooseGscSite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ reportId: z.string().uuid(), siteUrl: z.string().min(1) }).parse(input),
  )
  .handler(async ({ context, data }) => setGscSite(context.userId, data.reportId, data.siteUrl));

export const listGoogleAdsCustomers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => reportOnly.parse(input))
  .handler(async ({ context, data }) =>
    listGoogleAdsCustomersForReport(context.userId, data.reportId),
  );

export const chooseGoogleAdsCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ reportId: z.string().uuid(), customerId: z.string().min(1) }).parse(input),
  )
  .handler(async ({ context, data }) =>
    setGoogleAdsCustomer(context.userId, data.reportId, data.customerId),
  );

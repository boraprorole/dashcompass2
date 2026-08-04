import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getUserSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const { getUserSubscriptionImpl } = await import("./subscriptions.server");
    return getUserSubscriptionImpl(context.userId, data.userId);
  });

export const grantTrial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ userId: z.string().uuid(), days: z.number().int().min(1).max(365) }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const { grantTrialImpl } = await import("./subscriptions.server");
    return grantTrialImpl(context.userId, data.userId, data.days);
  });

export const setSubscriptionExpiration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ userId: z.string().uuid(), endsAt: z.string().min(4) }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const { setExpirationImpl } = await import("./subscriptions.server");
    return setExpirationImpl(context.userId, data.userId, new Date(data.endsAt).toISOString());
  });

export const setSubscriptionAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ userId: z.string().uuid(), active: z.boolean() }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const { setAccessImpl } = await import("./subscriptions.server");
    return setAccessImpl(context.userId, data.userId, data.active);
  });

export const syncSubscriptionWithStripe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const { syncWithStripeImpl } = await import("./subscriptions.server");
    return syncWithStripeImpl(context.userId, data.userId);
  });

export const openCustomerPortalAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ userId: z.string().uuid(), returnUrl: z.string().url() }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const { adminPortalImpl } = await import("./subscriptions.server");
    return adminPortalImpl(context.userId, data.userId, data.returnUrl);
  });

export const getMySubscriptionAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getMyAccessImpl } = await import("./subscriptions.server");
    return getMyAccessImpl(context.userId);
  });

export const openMyCustomerPortal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ returnUrl: z.string().url() }).parse(input))
  .handler(async ({ context, data }) => {
    const { myPortalImpl } = await import("./subscriptions.server");
    return myPortalImpl(context.userId, data.returnUrl);
  });

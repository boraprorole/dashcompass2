import { createStripeClient, getStripeErrorMessage, type StripeEnv } from "./stripe.server";

export type SubscriptionRow = {
  id: string;
  user_id: string;
  status: string;
  plan_label: string | null;
  price_id: string | null;
  product_id: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_provider: string;
  current_period_start: string | null;
  current_period_end: string | null;
  subscription_starts_at: string | null;
  subscription_ends_at: string | null;
  trial_ends_at: string | null;
  grace_period_ends_at: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  latest_invoice: string | null;
  last_sync_at: string | null;
  manual_override: boolean;
  environment: string;
  created_at: string;
  updated_at: string;
};

export type SubscriptionEvent = {
  id: string;
  event_type: string;
  source: string;
  description: string | null;
  created_at: string;
};

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Garante que o chamador é admin global (gestão de assinaturas é exclusiva dele). */
export async function assertGlobalAdmin(callerId: string) {
  const db = await admin();
  const { data, error } = await db
    .from("user_roles")
    .select("role")
    .eq("user_id", callerId)
    .in("role", ["admin_global", "admin"])
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin global only");
}

async function logEvent(params: {
  userId: string;
  subscriptionId?: string | null;
  eventType: string;
  source?: string;
  description?: string;
  actorId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const db = await admin();
  await db.from("subscription_events").insert({
    user_id: params.userId,
    subscription_id: params.subscriptionId ?? null,
    event_type: params.eventType,
    source: params.source ?? "admin",
    description: params.description ?? null,
    actor_id: params.actorId ?? null,
    metadata: (params.metadata ?? {}) as never,
  } as never);
}

export function computeEffectiveEnd(sub: Partial<SubscriptionRow> | null): string | null {
  if (!sub) return null;
  const candidates = [
    sub.subscription_ends_at,
    sub.current_period_end,
    sub.trial_ends_at,
    sub.grace_period_ends_at,
  ].filter(Boolean) as string[];
  if (!candidates.length) return null;
  return candidates.reduce((a, b) => (new Date(a) > new Date(b) ? a : b));
}

export function isSubscriptionValid(sub: Partial<SubscriptionRow> | null): boolean {
  if (!sub || !sub.status) return false;
  const end = computeEffectiveEnd(sub);
  const future = end ? new Date(end).getTime() > Date.now() : false;
  if (["active", "trialing"].includes(sub.status)) return end ? future : true;
  if (["past_due", "canceled"].includes(sub.status)) return future;
  return false;
}

/** Retorna a assinatura mais recente + histórico de um usuário. */
export async function getUserSubscriptionImpl(callerId: string, userId: string) {
  await assertGlobalAdmin(callerId);
  const db = await admin();

  const { data: sub } = await db
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: events } = await db
    .from("subscription_events")
    .select("id, event_type, source, description, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  const row = (sub ?? null) as SubscriptionRow | null;
  const effectiveEnd = computeEffectiveEnd(row);
  const daysLeft = effectiveEnd
    ? Math.ceil((new Date(effectiveEnd).getTime() - Date.now()) / 86_400_000)
    : null;

  return {
    subscription: row,
    effectiveEnd,
    daysLeft,
    valid: isSubscriptionValid(row),
    events: (events ?? []) as SubscriptionEvent[],
  };
}

async function upsertManual(
  userId: string,
  patch: Record<string, unknown>,
): Promise<SubscriptionRow> {
  const db = await admin();
  const { data: existing } = await db
    .from("subscriptions")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    const { data, error } = await db
      .from("subscriptions")
      .update({ ...patch, manual_override: true, updated_at: new Date().toISOString() } as never)
      .eq("id", (existing as { id: string }).id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data as unknown as SubscriptionRow;
  }

  const { data, error } = await db
    .from("subscriptions")
    .insert({
      user_id: userId,
      stripe_subscription_id: `manual_${crypto.randomUUID()}`,
      stripe_customer_id: "manual",
      status: "trialing",
      environment: "live",
      subscription_provider: "manual",
      manual_override: true,
      ...patch,
    } as never)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as unknown as SubscriptionRow;
}

export async function grantTrialImpl(callerId: string, userId: string, days: number) {
  await assertGlobalAdmin(callerId);
  const endsAt = new Date(Date.now() + days * 86_400_000).toISOString();
  const sub = await upsertManual(userId, {
    status: "trialing",
    trial_ends_at: endsAt,
    subscription_ends_at: endsAt,
    canceled_at: null,
  });
  await logEvent({
    userId,
    subscriptionId: sub.id,
    eventType: "trial_granted",
    description: `Trial manual de ${days} dias concedido (até ${endsAt}).`,
    actorId: callerId,
  });
  return { ok: true };
}

export async function setExpirationImpl(callerId: string, userId: string, endsAt: string) {
  await assertGlobalAdmin(callerId);
  const sub = await upsertManual(userId, { subscription_ends_at: endsAt });
  await logEvent({
    userId,
    subscriptionId: sub.id,
    eventType: "expiration_set",
    description: `Data de expiração definida manualmente para ${endsAt}.`,
    actorId: callerId,
  });
  return { ok: true };
}

export async function setAccessImpl(callerId: string, userId: string, active: boolean) {
  await assertGlobalAdmin(callerId);
  const patch = active
    ? {
        status: "active",
        canceled_at: null,
        subscription_ends_at: new Date(Date.now() + 30 * 86_400_000).toISOString(),
      }
    : { status: "canceled", canceled_at: new Date().toISOString(), subscription_ends_at: new Date().toISOString() };
  const sub = await upsertManual(userId, patch);
  await logEvent({
    userId,
    subscriptionId: sub.id,
    eventType: active ? "manual_reactivated" : "manual_canceled",
    description: active
      ? "Acesso reativado manualmente pelo admin global (+30 dias)."
      : "Acesso cancelado manualmente pelo admin global.",
    actorId: callerId,
  });
  return { ok: true };
}

/** Busca a assinatura no Stripe e grava o estado atual no banco. */
export async function syncWithStripeImpl(callerId: string, userId: string) {
  await assertGlobalAdmin(callerId);
  const db = await admin();

  const { data: existing } = await db
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const row = existing as SubscriptionRow | null;
  if (!row?.stripe_subscription_id || row.stripe_subscription_id.startsWith("manual_")) {
    return { error: "Este usuário não possui assinatura Stripe vinculada." };
  }

  try {
    const env = (row.environment === "sandbox" ? "sandbox" : "live") as StripeEnv;
    const stripe = createStripeClient(env);
    const sub = (await stripe.subscriptions.retrieve(row.stripe_subscription_id)) as never as {
      id: string;
      status: string;
      customer: string;
      cancel_at_period_end: boolean;
      canceled_at: number | null;
      trial_end: number | null;
      latest_invoice: string | null;
      current_period_start?: number;
      current_period_end?: number;
      items: { data: Array<{ current_period_start?: number; current_period_end?: number; price?: { id?: string; product?: string } }> };
    };

    const item = sub.items?.data?.[0];
    const start = item?.current_period_start ?? sub.current_period_start;
    const end = item?.current_period_end ?? sub.current_period_end;
    const iso = (s?: number | null) => (s ? new Date(s * 1000).toISOString() : null);

    const { error } = await db
      .from("subscriptions")
      .update({
        status: sub.status,
        stripe_customer_id: typeof sub.customer === "string" ? sub.customer : row.stripe_customer_id,
        current_period_start: iso(start),
        current_period_end: iso(end),
        subscription_starts_at: iso(start),
        subscription_ends_at: iso(end),
        cancel_at_period_end: !!sub.cancel_at_period_end,
        canceled_at: iso(sub.canceled_at),
        trial_ends_at: iso(sub.trial_end),
        latest_invoice: typeof sub.latest_invoice === "string" ? sub.latest_invoice : null,
        product_id: (item?.price?.product as string) ?? row.product_id,
        last_sync_at: new Date().toISOString(),
        manual_override: false,
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", row.id);
    if (error) return { error: error.message };

    await logEvent({
      userId,
      subscriptionId: row.id,
      eventType: "stripe_sync",
      source: "stripe",
      description: `Sincronizado com o Stripe. Status: ${sub.status}.`,
      actorId: callerId,
    });
    return { ok: true, status: sub.status };
  } catch (e) {
    return { error: getStripeErrorMessage(e) };
  }
}

/** Cria uma sessão do Customer Portal do Stripe para o cliente da assinatura. */
export async function portalLinkImpl(customerId: string, environment: StripeEnv, returnUrl: string) {
  try {
    const stripe = createStripeClient(environment);
    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
    return { url: portal.url };
  } catch (e) {
    return { error: getStripeErrorMessage(e) };
  }
}

/** Estado de acesso do usuário logado (depende da assinatura do admin da agência). */
export async function getMyAccessImpl(userId: string) {
  const db = await admin();
  const { data, error } = await db.rpc("subscription_access", { _user_id: userId } as never);
  if (error) throw new Error(error.message);
  return data as {
    allowed: boolean;
    reason: string;
    isOwner?: boolean;
    status?: string;
    endsAt?: string;
  };
}

/** Dados de portal para o usuário logado (self-service de pagamento). */
export async function myPortalImpl(userId: string, returnUrl: string) {
  const db = await admin();
  const { data } = await db
    .from("subscriptions")
    .select("stripe_customer_id, environment")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const row = data as { stripe_customer_id: string | null; environment: string } | null;
  if (!row?.stripe_customer_id || row.stripe_customer_id === "manual") {
    return { error: "Nenhum cliente Stripe vinculado à sua conta." };
  }
  return portalLinkImpl(
    row.stripe_customer_id,
    row.environment === "sandbox" ? "sandbox" : "live",
    returnUrl,
  );
}

export async function adminPortalImpl(callerId: string, userId: string, returnUrl: string) {
  await assertGlobalAdmin(callerId);
  const db = await admin();
  const { data } = await db
    .from("subscriptions")
    .select("stripe_customer_id, environment")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const row = data as { stripe_customer_id: string | null; environment: string } | null;
  if (!row?.stripe_customer_id || row.stripe_customer_id === "manual") {
    return { error: "Nenhum cliente Stripe vinculado a este usuário." };
  }
  return portalLinkImpl(
    row.stripe_customer_id,
    row.environment === "sandbox" ? "sandbox" : "live",
    returnUrl,
  );
}

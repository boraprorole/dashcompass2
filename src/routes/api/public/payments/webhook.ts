import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";
import type { Database } from "@/integrations/supabase/types";

let _supabase: ReturnType<typeof createClient<Database>> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient<Database>(
      process.env["SUPABASE_URL"]!,
      process.env["SUPABASE_SERVICE_ROLE_KEY"]!,
    );
  }
  return _supabase;
}


/** Cria a agência, a empresa e o relatório inicial do assinante (idempotente). */
async function provisionAccount(userId: string, companyName: string) {
  if (!userId || !companyName) return;
  const supabase = getSupabase();

  const { data: existingRole } = await supabase
    .from("user_roles")
    .select("agency_id")
    .eq("user_id", userId)
    .eq("role", "admin_agencia")
    .maybeSingle();

  let agencyId = (existingRole as { agency_id?: string } | null)?.agency_id ?? null;

  if (!agencyId) {
    const { data: agency, error: agencyError } = await supabase
      .from("agencies")
      .insert({ name: companyName })
      .select("id")
      .single();
    if (agencyError) {
      console.error("provisionAccount: agency insert failed", agencyError.message);
      return;
    }
    agencyId = (agency as { id: string }).id;

    const { error: roleError } = await supabase
      .from("user_roles")
      .insert({ user_id: userId, role: "admin_agencia", agency_id: agencyId });
    if (roleError) console.error("provisionAccount: role insert failed", roleError.message);
  }

  const { data: existingCompany } = await supabase
    .from("companies")
    .select("id")
    .eq("agency_id", agencyId)
    .eq("name", companyName)
    .maybeSingle();

  let companyId = (existingCompany as { id: string } | null)?.id ?? null;

  if (!companyId) {
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .insert({ name: companyName, agency_id: agencyId })
      .select("id")
      .single();
    if (companyError) {
      console.error("provisionAccount: company insert failed", companyError.message);
      return;
    }
    companyId = (company as { id: string }).id;
  }

  const { data: existingReport } = await supabase
    .from("reports")
    .select("id")
    .eq("company_id", companyId)
    .maybeSingle();

  if (!existingReport) {
    const { error: reportError } = await supabase.from("reports").insert({
      title: companyName,
      company_id: companyId,
      agency_id: agencyId,
      created_by: userId,
    });
    if (reportError) console.error("provisionAccount: report insert failed", reportError.message);
  }

  await supabase.from("profiles").update({ company_id: companyId }).eq("id", userId);
}

async function logEvent(
  userId: string,
  eventType: string,
  description: string,
) {
  if (!userId) return;
  await getSupabase()
    .from("subscription_events")
    .insert({ user_id: userId, event_type: eventType, source: "stripe", description } as never);
}

async function upsertSubscription(subscription: any, env: StripeEnv) {
  const userId = subscription.metadata?.userId;
  if (!userId) {
    console.error("Webhook: subscription without userId metadata");
    return;
  }

  const item = subscription.items?.data?.[0];
  const priceId =
    subscription.metadata?.planKey ||
    item?.price?.lookup_key ||
    item?.price?.metadata?.lovable_external_id ||
    item?.price?.id;
  const productId = item?.price?.product ?? null;
  const periodStart = item?.current_period_start ?? subscription.current_period_start;
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;
  const iso = (s?: number | null) => (s ? new Date(s * 1000).toISOString() : null);

  await getSupabase()
    .from("subscriptions")
    .upsert(
      {
        user_id: userId,
        stripe_subscription_id: subscription.id,
        stripe_customer_id: subscription.customer,
        product_id: productId,
        price_id: priceId,
        plan_label: subscription.metadata?.planKey ?? null,
        status: subscription.status,
        subscription_provider: "stripe",
        current_period_start: iso(periodStart),
        current_period_end: iso(periodEnd),
        subscription_starts_at: iso(periodStart),
        subscription_ends_at: iso(periodEnd),
        trial_ends_at: iso(subscription.trial_end),
        canceled_at: iso(subscription.canceled_at),
        latest_invoice:
          typeof subscription.latest_invoice === "string" ? subscription.latest_invoice : null,
        cancel_at_period_end: subscription.cancel_at_period_end || false,
        environment: env,
        last_sync_at: new Date().toISOString(),
        manual_override: false,
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: "stripe_subscription_id" },
    );

  await logEvent(userId, "subscription_synced", `Stripe status: ${subscription.status}.`);

  if (["active", "trialing"].includes(subscription.status)) {
    await provisionAccount(userId, subscription.metadata?.companyName ?? "");
  }
}

/** Atualiza status a partir de eventos de fatura. */
async function handleInvoice(invoice: any, env: StripeEnv, paid: boolean) {
  const subscriptionId = invoice.subscription;
  if (!subscriptionId || typeof subscriptionId !== "string") return;

  const db = getSupabase();
  const { data: row } = await db
    .from("subscriptions")
    .select("id, user_id")
    .eq("stripe_subscription_id", subscriptionId)
    .eq("environment", env)
    .maybeSingle();

  await db
    .from("subscriptions")
    .update({
      latest_invoice: invoice.id,
      ...(paid ? {} : { status: "past_due" }),
      last_sync_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as never)
    .eq("stripe_subscription_id", subscriptionId)
    .eq("environment", env);

  const userId = (row as { user_id?: string } | null)?.user_id ?? "";
  await logEvent(
    userId,
    paid ? "invoice_paid" : "invoice_payment_failed",
    paid ? `Fatura ${invoice.id} paga.` : `Falha no pagamento da fatura ${invoice.id}.`,
  );
}

async function handleWebhook(req: Request, env: StripeEnv) {
  const event = await verifyWebhook(req, env);

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
      await upsertSubscription(event.data.object, env);
      break;
    case "customer.subscription.deleted": {
      const sub = event.data.object;
      await getSupabase()
        .from("subscriptions")
        .update({
          status: "canceled",
          canceled_at: new Date().toISOString(),
          last_sync_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as never)
        .eq("stripe_subscription_id", sub.id)
        .eq("environment", env);
      await logEvent(sub.metadata?.userId ?? "", "subscription_deleted", "Assinatura cancelada no Stripe.");
      break;
    }
    case "invoice.paid":
      await handleInvoice(event.data.object, env, true);
      break;
    case "invoice.payment_failed":
      await handleInvoice(event.data.object, env, false);
      break;
    case "checkout.session.completed": {
      const session = event.data.object;
      if (session.payment_status !== "unpaid") {
        await provisionAccount(
          session.metadata?.userId ?? "",
          session.metadata?.companyName ?? "",
        );
        await logEvent(session.metadata?.userId ?? "", "checkout_completed", "Checkout concluído.");
      }
      break;
    }
    case "checkout.session.async_payment_succeeded":
      await provisionAccount(
        event.data.object.metadata?.userId ?? "",
        event.data.object.metadata?.companyName ?? "",
      );
      break;
    default:
      console.log("Unhandled event:", event.type);
  }
}


export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          console.error("Webhook with invalid env:", rawEnv);
          return Response.json({ received: true, ignored: "invalid env" });
        }
        try {
          await handleWebhook(request, rawEnv);
          return Response.json({ received: true });
        } catch (e) {
          console.error("Webhook error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});

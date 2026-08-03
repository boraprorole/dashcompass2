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

  await getSupabase()
    .from("subscriptions")
    .upsert(
      {
        user_id: userId,
        stripe_subscription_id: subscription.id,
        stripe_customer_id: subscription.customer,
        product_id: productId,
        price_id: priceId,
        status: subscription.status,
        current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
        current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
        cancel_at_period_end: subscription.cancel_at_period_end || false,
        environment: env,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "stripe_subscription_id" },
    );

  if (["active", "trialing"].includes(subscription.status)) {
    await provisionAccount(userId, subscription.metadata?.companyName ?? "");
  }
}

async function handleWebhook(req: Request, env: StripeEnv) {
  const event = await verifyWebhook(req, env);

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
      await upsertSubscription(event.data.object, env);
      break;
    case "customer.subscription.deleted":
      await getSupabase()
        .from("subscriptions")
        .update({ status: "canceled", updated_at: new Date().toISOString() })
        .eq("stripe_subscription_id", event.data.object.id)
        .eq("environment", env);
      break;
    case "checkout.session.completed": {
      const session = event.data.object;
      if (session.payment_status !== "unpaid") {
        await provisionAccount(
          session.metadata?.userId ?? "",
          session.metadata?.companyName ?? "",
        );
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

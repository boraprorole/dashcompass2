import { createFileRoute } from "@tanstack/react-router";
import { handleStripeWebhookImpl } from "@/lib/stripe.server";

export const Route = createFileRoute("/api/public/stripe-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.text();
        const signature = request.headers.get("stripe-signature") || "";
        
        try {
          const result = await handleStripeWebhookImpl(JSON.parse(body), signature);
          return new Response(JSON.stringify(result), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          });
        } catch (err: any) {
          return new Response(err.message, { status: 400 });
        }
      }
    }
  }
});

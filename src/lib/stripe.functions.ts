import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const createCheckoutSession = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({
    email: z.string().email(),
    planId: z.string(),
    companyName: z.string(),
    origin: z.string(),
  }).parse(data))
  .handler(async ({ data }) => {
    const { createStripeCheckoutSessionImpl } = await import("./stripe.server");
    return createStripeCheckoutSessionImpl(data);
  });
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const createCheckoutSession = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        planKey: z.string().min(1).max(50),
        currency: z.enum(["brl", "usd"]),
        email: z.string().email(),
        userId: z.string().uuid(),
        companyName: z.string().trim().min(1).max(120),
        returnUrl: z.string().url(),
        environment: z.enum(["sandbox", "live"]),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { createEmbeddedCheckoutImpl } = await import("./stripe.server");
    return createEmbeddedCheckoutImpl(data);
  });

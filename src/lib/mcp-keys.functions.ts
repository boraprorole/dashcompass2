import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { listMcpKeysImpl, createMcpKeyImpl, revokeMcpKeyImpl } from "./mcp-keys.server";

export const listMcpKeys = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => listMcpKeysImpl(context.userId));

export const createMcpKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ label: z.string().trim().min(1, "Informe um nome.").max(80) }).parse(input),
  )
  .handler(async ({ context, data }) => createMcpKeyImpl(context.userId, data.label));

export const revokeMcpKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => revokeMcpKeyImpl(context.userId, data.id));

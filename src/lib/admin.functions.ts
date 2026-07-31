import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { listUsersImpl, setUserRoleImpl } from "./admin.server";

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    return listUsersImpl(context.userId);
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      userId: z.string().uuid(),
      role: z.enum(["admin", "team", "conexoes", "admin_agencia", "admin_global"]).default("admin"),
      assign: z.boolean(),
    }).parse(input),
  )
  .handler(async ({ context, data }) => {
    return setUserRoleImpl(context.userId, data.userId, data.role, data.assign);
  });


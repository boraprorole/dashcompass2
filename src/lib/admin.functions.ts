import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { listUsersImpl, setUserRoleImpl, linkUserToAgencyImpl } from "./admin.server";

export const linkUserToAgency = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      email: z.string().email("Informe um e-mail válido."),
      role: z.enum(["user", "team"]),
      active: z.boolean(),
    }).parse(input),
  )
  .handler(async ({ context, data }) => {
    return linkUserToAgencyImpl(context.userId, data.email, data.role, data.active);
  });

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


export const linkUserToCompanyByEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      email: z.string().email("Informe um e-mail válido."),
      companyId: z.string().uuid(),
    }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const { linkUserToCompanyByEmailImpl } = await import("./admin.server");
    return linkUserToCompanyByEmailImpl(context.userId, data.email, data.companyId);
  });

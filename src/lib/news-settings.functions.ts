import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getNewsKeyStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: role } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .in("role", ["admin", "admin_global", "admin_agencia"])
      .limit(1)
      .maybeSingle();
    
    if (!role) throw new Error("Forbidden: admin only");

    const { data } = await supabaseAdmin
      .from("app_settings")
      .select("value, updated_at")
      .eq("key", "news_api_key")
      .maybeSingle();
    
    const dbKey = data?.value ?? null;
    const envKey = process.env.NEWS_API_KEY ?? null;
    
    return {
      hasKey: !!(dbKey || envKey),
      source: dbKey ? "database" : envKey ? "env" : null,
      masked: dbKey ? `${dbKey.slice(0, 4)}…${dbKey.slice(-4)}` : envKey ? `${envKey.slice(0, 4)}…${envKey.slice(-4)}` : null,
      updatedAt: data?.updated_at ?? null,
    };
  });

export const setNewsKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ value: z.string().min(4).max(512) }).parse(input))
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: role } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .in("role", ["admin", "admin_global", "admin_agencia"])
      .limit(1)
      .maybeSingle();
    
    if (!role) throw new Error("Forbidden: admin only");

    const clean = data.value.trim();
    const { error } = await supabaseAdmin
      .from("app_settings")
      .upsert({ 
        key: "news_api_key", 
        value: clean, 
        updated_at: new Date().toISOString() 
      });
    
    if (error) throw new Error(error.message);
    return { ok: true };
  });

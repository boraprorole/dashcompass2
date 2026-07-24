import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function saveGadsConnection(opts: { userId: string; reportId: string; refreshToken: string; googleEmail: string | null }) {
  const { error } = await supabaseAdmin.from("google_ads_connections").upsert({
    report_id: opts.reportId,
    refresh_token: opts.refreshToken,
    google_email: opts.googleEmail,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'report_id' });
  if (error) throw error;
}

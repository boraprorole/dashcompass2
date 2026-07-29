import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function saveGadsConnection(opts: { userId: string; reportId: string; refreshToken: string; googleEmail: string | null }) {
  // Update ALL existing connections for this report
  await supabaseAdmin
    .from("google_ads_connections")
    .update({
      refresh_token: opts.refreshToken,
      google_email: opts.googleEmail,
      updated_at: new Date().toISOString(),
    })
    .eq("report_id", opts.reportId);

  // Ensure at least one exists
  const { data: existing } = await supabaseAdmin
    .from("google_ads_connections")
    .select("id")
    .eq("report_id", opts.reportId)
    .limit(1);

  if (!existing || existing.length === 0) {
    const { error } = await supabaseAdmin.from("google_ads_connections").insert({
      report_id: opts.reportId,
      refresh_token: opts.refreshToken,
      google_email: opts.googleEmail,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
  }
}

import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function saveGscConnection(opts: { userId: string; reportId: string; refreshToken: string; googleEmail: string | null }) {
  // Update ALL existing connections for this report with the new refresh token
  const { error: updateError } = await supabaseAdmin
    .from("gsc_connections")
    .update({
      refresh_token: opts.refreshToken,
      google_email: opts.googleEmail,
      updated_at: new Date().toISOString(),
    })
    .eq("report_id", opts.reportId);

  // Check if we have at least one (web) connection
  const { data: existing } = await supabaseAdmin
    .from("gsc_connections")
    .select("id")
    .eq("report_id", opts.reportId)
    .eq("type", "web")
    .limit(1);

  if (!existing || existing.length === 0) {
    const { error: insertError } = await supabaseAdmin.from("gsc_connections").insert({
      report_id: opts.reportId,
      refresh_token: opts.refreshToken,
      google_email: opts.googleEmail,
      type: "web",
      updated_at: new Date().toISOString(),
    });
    if (insertError) throw insertError;
  }
}

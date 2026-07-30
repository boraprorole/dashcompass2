import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function getBingAccessToken(refreshToken: string) {
  const BING_TOKEN_URL = "https://www.bing.com/webmasters/oauth/token";
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;

  const res = await fetch(BING_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId!,
      client_secret: clientSecret!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) throw new Error(`Bing refresh token error: ${res.status}`);
  const data = await res.json();
  return data.access_token as string;
}

export async function listBingSites(reportId: string) {
  const { data: conn } = await supabaseAdmin
    .from("bing_connections")
    .select("refresh_token, site_url")
    .eq("report_id", reportId)
    .single();

  if (!conn?.refresh_token) throw new Error("Bing not connected");

  const accessToken = await getBingAccessToken(conn.refresh_token);

  // Bing Webmaster Tools API JSON endpoint
  // https://learn.microsoft.com/en-us/bingwebmaster/api-overview
  const res = await fetch(`https://www.bing.com/webmasters/api/json/v2/GetUserSites?apikey=${accessToken}`, {
    method: "GET"
  });

  if (!res.ok) throw new Error("Failed to fetch sites from Bing");
  const data = await res.json();
  
  // The Bing API usually returns { d: [ { Url: "..." }, ... ] }
  const sites = (data.d || []).map((s: any) => ({
    siteUrl: s.Url || s.url
  }));

  return { sites, current: conn.site_url };
}

export async function chooseBingSite(reportId: string, siteUrl: string) {
  const { error } = await supabaseAdmin
    .from("bing_connections")
    .update({ site_url: siteUrl, updated_at: new Date().toISOString() })
    .eq("report_id", reportId);

  if (error) throw error;
  return { success: true };
}

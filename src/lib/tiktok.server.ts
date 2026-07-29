import { supabaseAdmin } from "@/integrations/supabase/client.server";

const AUTH_URL = "https://business-api.tiktok.com/portal/auth";
const TOKEN_URL = "https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/";
const TIKTOK_REDIRECT_URI = "https://www.dashcompass.com/api/public/tiktok/oauth/callback";

export async function buildTiktokAuthUrl(opts: { reportId: string; userId: string }) {
  const appId = process.env.TIKTOK_APP_ID;
  if (!appId) throw new Error("TIKTOK_APP_ID não configurado");

  // TikTok usa state para segurança e para passar dados adicionais
  const state = JSON.stringify({ reportId: opts.reportId, userId: opts.userId });
  const encodedState = btoa(state);

  const params = new URLSearchParams({
    app_id: appId,
    redirect_uri: TIKTOK_REDIRECT_URI,
    state: encodedState,
  });

  return `${AUTH_URL}?${params.toString()}`;
}

export async function exchangeTiktokCode(code: string) {
  const appId = process.env.TIKTOK_APP_ID;
  const secret = process.env.TIKTOK_SECRET;
  if (!appId || !secret) throw new Error("TikTok API não configurada");

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      app_id: appId,
      secret: secret,
      auth_code: code,
    }),
  });

  const data = await res.json();
  if (data.code !== 0) {
    throw new Error(`Erro TikTok Token: ${data.message} (code: ${data.code})`);
  }

  return data.data as {
    access_token: string;
    refresh_token: string;
    scope: string[];
    seller_ids?: string[];
    advertiser_ids?: string[];
  };
}

export async function saveTiktokConnection(opts: { 
  reportId: string; 
  accessToken: string; 
  refreshToken: string;
  advertiserId?: string;
}) {
  const { error } = await supabaseAdmin.from("tiktok_connections").upsert({
    report_id: opts.reportId,
    access_token: opts.accessToken,
    refresh_token: opts.refreshToken,
    tiktok_advertiser_id: opts.advertiserId,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'report_id' });
  
  if (error) throw error;
}

export async function listTiktokAdvertisers(accessToken: string) {
  const appId = process.env.TIKTOK_APP_ID;
  const secret = process.env.TIKTOK_SECRET;
  
  // TikTok Advertiser List API
  const res = await fetch(`https://business-api.tiktok.com/open_api/v1.3/oauth2/advertiser/get/?app_id=${appId}&secret=${secret}`, {
    headers: {
      "Access-Token": accessToken
    }
  });
  
  const data = await res.json();
  if (data.code !== 0) return [];
  
  return data.data.list as Array<{ advertiser_id: string; advertiser_name: string }>;
}

import { supabaseAdmin } from "@/integrations/supabase/client.server";

const AUTH_URL = "https://business-api.tiktok.com/portal/auth";
const TOKEN_URL = "https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/";
const TIKTOK_REDIRECT_URI = "https://dashcompass.com/auth/tiktok/callback";

type TikTokAdsConfig = {
  appId: string;
  secret: string;
};

type TikTokTokenResponse = {
  code?: number;
  message?: string;
  data?: {
    access_token: string;
    refresh_token: string;
    scope: string[];
    seller_ids?: string[];
    advertiser_ids?: string[];
  };
};

type TikTokAdvertiserResponse = {
  code?: number;
  data?: {
    list?: Array<{ advertiser_id: string; advertiser_name: string }>;
  };
};

function getTiktokAdsConfig(): TikTokAdsConfig {
  const appId = process.env.TIKTOK_ADS_APP_ID || process.env.TIKTOK_APP_ID;
  const appIdSource = process.env.TIKTOK_ADS_APP_ID ? "TIKTOK_ADS_APP_ID" : "TIKTOK_APP_ID";
  const secret = process.env.TIKTOK_ADS_SECRET || process.env.TIKTOK_SECRET;

  if (!appId) {
    throw new Error("TIKTOK_ADS_APP_ID não configurado");
  }

  if (!/^\d+$/.test(appId)) {
    throw new Error(
      `${appIdSource} precisa ser o App ID numérico do TikTok Ads. ` +
        "O valor atual parece ser uma Client Key; salve o App ID numérico em TIKTOK_ADS_APP_ID.",
    );
  }

  if (!secret) {
    throw new Error("TIKTOK_ADS_SECRET/TIKTOK_SECRET não configurado");
  }

  return { appId, secret };
}

export async function buildTiktokAuthUrl(opts: { reportId: string; userId: string }) {
  const { appId } = getTiktokAdsConfig();

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
  const { appId, secret } = getTiktokAdsConfig();

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      app_id: appId,
      secret: secret,
      auth_code: code,
    }),
  });

  const data = (await res.json()) as TikTokTokenResponse;
  if (data.code !== 0) {
    throw new Error(`Erro TikTok Token: ${data.message} (code: ${data.code})`);
  }

  if (!data.data?.access_token || !data.data.refresh_token) {
    throw new Error("TikTok Token: resposta sem access_token ou refresh_token");
  }

  return data.data;
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
  const { appId, secret } = getTiktokAdsConfig();
  const params = new URLSearchParams({ app_id: appId, secret });
  
  // TikTok Advertiser List API
  const res = await fetch(`https://business-api.tiktok.com/open_api/v1.3/oauth2/advertiser/get/?${params.toString()}`, {
    headers: {
      "Access-Token": accessToken
    }
  });
  
  const data = (await res.json()) as TikTokAdvertiserResponse;
  if (data.code !== 0) return [];
  
  return data.data?.list ?? [];
}

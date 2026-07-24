import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { refreshAccessToken } from "./ga.server";
import { getSearchConsoleTopImpl } from "./windsor.server";

const ADS_API = "https://googleads.googleapis.com/v21";

export type EmvRange = { datePreset?: string; dateFrom?: string; dateTo?: string };

export type EmvResult = {
  emv: number;
  currency: string;
  keywordsAnalyzed: number;
  keywordsMatched: number;
  breakdown: Array<{ keyword: string; clicks: number; cpc: number; value: number }>;
  error?: string;
  needsReauth?: boolean;
};

type GoogleAdsKeywordMetricsResponse = {
  results?: Array<{
    text?: string;
    keywordMetrics?: {
      lowTopOfPageBidMicros?: string;
      highTopOfPageBidMicros?: string;
    };
  }>;
};

type GoogleAdsAttempt = {
  customerId: string;
  loginCustomerId?: string;
};

function normalizeCustomerId(v: string) {
  return v.replace(/\D/g, "");
}

async function listAccessibleGoogleAdsCustomers(
  accessToken: string,
  devToken: string,
): Promise<string[]> {
  const res = await fetch(`${ADS_API}/customers:listAccessibleCustomers`, {
    headers: {
      authorization: `Bearer ${accessToken}`,
      "developer-token": devToken,
    },
  });
  if (!res.ok) return [];
  const json = (await res.json()) as { resourceNames?: string[] };
  return (json.resourceNames ?? [])
    .map((name) => normalizeCustomerId(name))
    .filter(Boolean);
}

function buildAdsAttempts(configuredCustomerId: string, accessibleCustomerIds: string[]) {
  const attempts: GoogleAdsAttempt[] = [{ customerId: configuredCustomerId, loginCustomerId: configuredCustomerId }];
  for (const customerId of accessibleCustomerIds) {
    attempts.push({ customerId });
    if (customerId !== configuredCustomerId) {
      attempts.push({ customerId, loginCustomerId: configuredCustomerId });
    }
  }

  const seen = new Set<string>();
  return attempts.filter((attempt) => {
    const key = `${attempt.customerId}:${attempt.loginCustomerId ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function getReportEmvImpl(
  userId: string,
  reportId: string,
  range: EmvRange = { datePreset: "last_30d" },
): Promise<EmvResult> {
  const empty = (error?: string, needsReauth = false): EmvResult => ({
    emv: 0,
    currency: "BRL",
    keywordsAnalyzed: 0,
    keywordsMatched: 0,
    breakdown: [],
    error,
    needsReauth,
  });

  const devToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  const rawCid = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID;
  if (!devToken || !rawCid) return empty("Google Ads não configurado");
  const loginCustomerId = normalizeCustomerId(rawCid);

  // 1) Aggregate top GSC queries across accounts (assertReportAccess enforced inside)
  const gscTop = await getSearchConsoleTopImpl(userId, reportId, range, 50);
  const queriesMap = new Map<string, number>();
  for (const acc of gscTop) {
    for (const q of acc.queries ?? []) {
      const kw = q.key.trim().toLowerCase();
      if (!kw) continue;
      queriesMap.set(kw, (queriesMap.get(kw) ?? 0) + q.clicks);
    }
  }
  const topQueries = Array.from(queriesMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 200);
  if (topQueries.length === 0) {
    return empty(
      gscTop.length === 0
        ? "Conecte o Google Search Console no admin do relatório"
        : "Sem queries do Search Console no período — a Windsor pode levar algumas horas após conectar para começar a sincronizar. Tente novamente em breve ou aumente o período.",
    );
  }

  // 2) Use the newest Google OAuth tokens first. Reconnecting Google creates a new
  // row, so picking an arbitrary old row can keep using a token without Ads scope.
  const { data: conns, error: connsError } = await supabaseAdmin
    .from("ga_connections")
    .select("refresh_token, created_at")
    .eq("report_id", reportId)
    .not("refresh_token", "is", null)
    .order("created_at", { ascending: false });
  if (connsError) throw new Error(connsError.message);
  if (!conns || conns.length === 0) {
    return empty("Conecte o Google Analytics no admin do relatório");
  }

  // 3) Google Ads: keyword historical metrics
  const body = {
    keywords: topQueries.map(([kw]) => kw),
    geoTargetConstants: ["geoTargetConstants/2076"], // Brazil
    keywordPlanNetwork: "GOOGLE_SEARCH",
    includeAdultKeywords: false,
    language: "languageConstants/1014", // Portuguese
  };
  let json: GoogleAdsKeywordMetricsResponse | undefined;
  let lastAuthError = "";
  let lastPermissionError = "";
  const oauthConnections = conns as Array<{ refresh_token: string }>;

  for (const conn of oauthConnections) {
    let access_token: string;
    try {
      ({ access_token } = await refreshAccessToken(conn.refresh_token));
    } catch (e) {
      lastAuthError = `OAuth: ${(e as Error).message}`;
      continue;
    }

    const accessibleCustomerIds = await listAccessibleGoogleAdsCustomers(access_token, devToken);
    const attempts = buildAdsAttempts(loginCustomerId, accessibleCustomerIds).slice(0, 20);

    for (const attempt of attempts) {
      const headers: Record<string, string> = {
        authorization: `Bearer ${access_token}`,
        "developer-token": devToken,
        "content-type": "application/json",
      };
      if (attempt.loginCustomerId) headers["login-customer-id"] = attempt.loginCustomerId;

      const res = await fetch(
        `${ADS_API}/customers/${attempt.customerId}:generateKeywordHistoricalMetrics`,
        {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        },
      );
      if (res.ok) {
        json = (await res.json()) as GoogleAdsKeywordMetricsResponse;
        break;
      }

      const text = await res.text();
      const tokenAuthError =
        res.status === 401 ||
        /ACCESS_TOKEN_SCOPE_INSUFFICIENT|invalid_scope|insufficient/i.test(text);
      if (tokenAuthError) {
        lastAuthError = `Google Ads ${res.status}: ${text.slice(0, 400)}`;
        break;
      }
      if (/DEVELOPER_TOKEN_NOT_APPROVED/i.test(text)) {
        return empty(
          "O Developer Token do Google Ads configurado ainda não está aprovado para usar a API. Atualize para um token aprovado ou solicite aprovação no Google Ads API Center.",
        );
      }
      if (/USER_PERMISSION_DENIED/i.test(text)) {
        lastPermissionError = `Google Ads ${res.status}: ${text.slice(0, 400)}`;
        continue;
      }
      return empty(`Google Ads ${res.status}: ${text.slice(0, 400)}`);
    }

    if (json) break;
  }

  const adsResponse = json;
  if (!adsResponse) {
    if (lastPermissionError) {
      return empty(
        "A conta Google conectada tem o scope de Google Ads, mas não tem acesso à conta Google Ads configurada. Conecte uma conta com acesso ao Google Ads ou atualize o Customer ID configurado.",
      );
    }
    return empty(
      lastAuthError || "Nenhuma conexão Google autorizada conseguiu acessar o Google Ads",
      true,
    );
  }

  const cpcMap = new Map<string, number>();
  for (const r of adsResponse.results ?? []) {
    const kw = (r.text ?? "").trim().toLowerCase();
    if (!kw) continue;
    const lo = Number(r.keywordMetrics?.lowTopOfPageBidMicros ?? 0) / 1_000_000;
    const hi = Number(r.keywordMetrics?.highTopOfPageBidMicros ?? 0) / 1_000_000;
    const cpc = lo && hi ? (lo + hi) / 2 : lo || hi;
    if (cpc > 0) cpcMap.set(kw, cpc);
  }

  let emv = 0;
  const breakdown = topQueries
    .map(([kw, clicks]) => {
      const cpc = cpcMap.get(kw) ?? 0;
      const value = clicks * cpc;
      emv += value;
      return { keyword: kw, clicks, cpc, value };
    })
    .sort((a, b) => b.value - a.value);

  return {
    emv,
    currency: "BRL",
    keywordsAnalyzed: topQueries.length,
    keywordsMatched: cpcMap.size,
    breakdown: breakdown.slice(0, 20),
  };
}

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { assertAdminGa, refreshAccessToken } from "./ga.server";

/* ------------------------ GA4 ------------------------ */

export async function listGa4PropertiesForReport(userId: string, reportId: string) {
  await assertAdminGa(userId);
  const { data: conn } = await supabaseAdmin
    .from("ga_connections")
    .select("id, refresh_token, ga_property_id")
    .eq("report_id", reportId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!conn) return { connectionId: null, current: null, properties: [] as Array<{ propertyId: string; displayName: string; account: string }> };
  const { access_token } = await refreshAccessToken(conn.refresh_token);
  const res = await fetch(
    "https://analyticsadmin.googleapis.com/v1beta/accountSummaries?pageSize=200",
    { headers: { authorization: `Bearer ${access_token}` } },
  );
  if (!res.ok) throw new Error(`GA Admin: ${res.status} ${await res.text()}`);
  const j = (await res.json()) as {
    accountSummaries?: Array<{
      account: string;
      displayName: string;
      propertySummaries?: Array<{ property: string; displayName: string }>;
    }>;
  };
  const properties: Array<{ propertyId: string; displayName: string; account: string }> = [];
  for (const acc of j.accountSummaries ?? []) {
    for (const p of acc.propertySummaries ?? []) {
      properties.push({
        propertyId: p.property.replace("properties/", ""),
        displayName: p.displayName,
        account: acc.displayName,
      });
    }
  }
  return { connectionId: conn.id, current: conn.ga_property_id, properties };
}

export async function setGa4Property(userId: string, reportId: string, propertyId: string) {
  await assertAdminGa(userId);
  const { error } = await supabaseAdmin
    .from("ga_connections")
    .update({ ga_property_id: propertyId, label: `GA4 ${propertyId}` })
    .eq("report_id", reportId)
    .eq("ga_property_id", "PENDING");
  if (error) throw new Error(error.message);
  return { ok: true };
}

/* ------------------------ GSC ------------------------ */

export async function listGscSitesForReport(userId: string, reportId: string) {
  await assertAdminGa(userId);
  const { data: conn } = await supabaseAdmin
    .from("gsc_connections")
    .select("id, refresh_token, site_url")
    .eq("report_id", reportId)
    .maybeSingle();
  if (!conn) return { current: null, sites: [] as Array<{ siteUrl: string; permissionLevel: string }> };
  const { access_token } = await refreshAccessToken(conn.refresh_token);
  const res = await fetch("https://www.googleapis.com/webmasters/v3/sites", {
    headers: { authorization: `Bearer ${access_token}` },
  });
  if (!res.ok) throw new Error(`GSC sites: ${res.status} ${await res.text()}`);
  const j = (await res.json()) as { siteEntry?: Array<{ siteUrl: string; permissionLevel: string }> };
  return { current: conn.site_url, sites: j.siteEntry ?? [] };
}

export async function setGscSite(userId: string, reportId: string, siteUrl: string) {
  await assertAdminGa(userId);
  const { error } = await supabaseAdmin
    .from("gsc_connections")
    .update({ site_url: siteUrl, updated_at: new Date().toISOString() })
    .eq("report_id", reportId)
    .is("site_url", null);
  if (error) throw new Error(error.message);
  return { ok: true };
}

/* ------------------------ Google Ads ------------------------ */

export async function listGoogleAdsCustomersForReport(userId: string, reportId: string) {
  await assertAdminGa(userId);
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  if (!developerToken) {
    throw new Error("GOOGLE_ADS_DEVELOPER_TOKEN não configurado");
  }
  const loginCustomerId = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID;

  const { data: conn } = await supabaseAdmin
    .from("google_ads_connections")
    .select("id, refresh_token, customer_id")
    .eq("report_id", reportId)
    .maybeSingle();
  
  if (!conn) return { current: null, customers: [] as Array<{ customerId: string; descriptiveName: string }> };
  
  const { access_token } = await refreshAccessToken(conn.refresh_token);

  const headers: Record<string, string> = {
    authorization: `Bearer ${access_token}`,
    "developer-token": developerToken,
    "content-type": "application/json",
  };
  if (loginCustomerId) headers["login-customer-id"] = loginCustomerId.replace(/-/g, "");

  const listRes = await fetch(
    "https://googleads.googleapis.com/v18/customers:listAccessibleCustomers",
    { headers },
  );
  
  if (!listRes.ok) {
    const errorText = await listRes.text();
    console.error("Ads list error:", listRes.status, errorText);
    throw new Error(`Ads list: ${listRes.status}. Verifique se o Developer Token e o Login Customer ID estão corretos.`);
  }

  const listJson = (await listRes.json()) as { resourceNames?: string[] };
  const ids = (listJson.resourceNames ?? []).map((r) => r.replace("customers/", ""));

  // Fetch descriptive names best-effort (parallel, tolerant of failures)
  const details = await Promise.all(
    ids.map(async (id) => {
      try {
        const r = await fetch(
          `https://googleads.googleapis.com/v18/customers/${id}/googleAds:search`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({
              query: "SELECT customer.id, customer.descriptive_name FROM customer LIMIT 1",
            }),
          },
        );
        if (!r.ok) return { customerId: id, descriptiveName: id };
        const j = (await r.json()) as {
          results?: Array<{ customer?: { id?: string; descriptiveName?: string } }>;
        };
        const name = j.results?.[0]?.customer?.descriptiveName ?? id;
        return { customerId: id, descriptiveName: name };
      } catch {
        return { customerId: id, descriptiveName: id };
      }
    }),
  );

  return { current: conn.customer_id, customers: details };
}

export async function setGoogleAdsCustomer(userId: string, reportId: string, customerId: string) {
  await assertAdminGa(userId);
  const { error } = await supabaseAdmin
    .from("google_ads_connections")
    .update({ customer_id: customerId, updated_at: new Date().toISOString() })
    .eq("report_id", reportId)
    .is("customer_id", null);
  if (error) throw new Error(error.message);
  return { ok: true };
}

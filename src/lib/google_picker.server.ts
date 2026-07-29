import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { assertAdminGa, refreshAccessToken } from "./ga.server";

/* ------------------------ GA4 ------------------------ */

export async function listGa4PropertiesForReport(userId: string, reportId: string) {
  await assertAdminGa(userId);
  const { data: conn } = await supabaseAdmin
    .from("ga_connections")
    .select("id, refresh_token, ga_property_id")
    .eq("report_id", reportId)
    .order("updated_at", { ascending: false })
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
    .update({ ga_property_id: propertyId, label: `GA4 ${propertyId}`, updated_at: new Date().toISOString() })
    .eq("report_id", reportId);
  if (error) throw new Error(error.message);
  return { ok: true };
}

/* ------------------------ GSC ------------------------ */

export async function listGscSitesForReport(userId: string, reportId: string) {
  await assertAdminGa(userId);
  const { data: conns } = await supabaseAdmin
    .from("gsc_connections")
    .select("id, refresh_token, site_url, type, google_email")
    .eq("report_id", reportId)
    .order("updated_at", { ascending: false });

  if (!conns || conns.length === 0) return { current: null, sites: [] as Array<{ siteUrl: string; permissionLevel: string }>, connections: [] };

  // For the unified picker UI, we'll fetch sites using the most recent connection's token
  // but the UI might need to handle multiple types. 
  // For now, we fetch the available sites for the account.
  const { access_token } = await refreshAccessToken(conns[0].refresh_token);
  console.log(`[GSC] Fetching sites using token for ${conns[0].google_email}`);
  const res = await fetch("https://www.googleapis.com/webmasters/v3/sites", {
    headers: { authorization: `Bearer ${access_token}` },
  });
  if (!res.ok) {
    const errorText = await res.text();
    console.error(`[GSC] Error fetching sites: ${res.status} ${errorText}`);
    throw new Error(`GSC sites: ${res.status} ${errorText}`);
  }
  const j = (await res.json()) as { siteEntry?: Array<{ siteUrl: string; permissionLevel: string }> };
  
  // The API returns all sites, including sc-domain: and prefix URLs (http/https).
  // TikTok/Instagram properties in GSC are usually registered as "sc-domain:tiktok.com/@user" or just the profile URL.
  // We return all sites so the user can pick the correct one for each type.
  return { 
    current: conns.find(c => c.type === 'web')?.site_url || conns[0].site_url, 
    sites: j.siteEntry ?? [],
    connections: conns.map(c => ({ id: c.id, site_url: c.site_url, type: c.type }))
  };
}

export async function setGscSite(userId: string, reportId: string, siteUrl: string, type: string = 'web') {
  await assertAdminGa(userId);
  
  // Try to find an existing connection of this type
  const { data: existing } = await supabaseAdmin
    .from("gsc_connections")
    .select("id")
    .eq("report_id", reportId)
    .eq("type", type)
    .maybeSingle();

  if (existing) {
    const { error } = await supabaseAdmin
      .from("gsc_connections")
      .update({ site_url: siteUrl, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    // If no connection of this type exists, we can't set the site unless we have a token.
    // Usually, the unified OAuth flow creates the initial rows.
    // If we're changing a site for a new type, we might need to find any valid refresh token for this report
    const { data: anyConn } = await supabaseAdmin
      .from("gsc_connections")
      .select("refresh_token, google_email")
      .eq("report_id", reportId)
      .limit(1)
      .maybeSingle();

    if (anyConn) {
      const { error } = await supabaseAdmin
        .from("gsc_connections")
        .insert({
          report_id: reportId,
          site_url: siteUrl,
          type,
          refresh_token: anyConn.refresh_token,
          google_email: anyConn.google_email,
          updated_at: new Date().toISOString()
        });
      if (error) throw new Error(error.message);
    }
  }
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
  
  console.log(`[Ads] Fetching accounts for ${conn.google_email} (Report: ${reportId})`);
  const { access_token } = await refreshAccessToken(conn.refresh_token);

  const headers: Record<string, string> = {
    authorization: `Bearer ${access_token}`,
    "developer-token": developerToken,
    "content-type": "application/json",
  };
  if (loginCustomerId) headers["login-customer-id"] = loginCustomerId.replace(/-/g, "");

  const listRes = await fetch(
    "https://googleads.googleapis.com/v16/customers:listAccessibleCustomers",
    { headers },
  );
  
  if (!listRes.ok) {
    const errorText = await listRes.text();
    console.error(`[Ads] listAccessibleCustomers error (${listRes.status}):`, errorText);
    throw new Error(`Ads list: ${listRes.status}. Verifique se o Developer Token está correto.`);
  }

  const listJson = (await listRes.json()) as { resourceNames?: string[] };
  const ids = (listJson.resourceNames ?? []).map((r) => r.replace("customers/", ""));

  // Fetch descriptive names best-effort (parallel, tolerant of failures)
  const details = await Promise.all(
    ids.map(async (id) => {
      try {
        const r = await fetch(
          `https://googleads.googleapis.com/v16/customers/${id}/googleAds:search`,
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
    .eq("report_id", reportId);
  if (error) throw new Error(error.message);
  return { ok: true };
}

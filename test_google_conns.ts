
import { listGa4PropertiesForReport, listGscSitesForReport, listGoogleAdsCustomersForReport } from "./src/lib/google_picker.server";

async function test() {
  const userId = "19553f65-fe9d-4387-88de-5a2cb4ad2bdb";
  const reportId = "86074719-ca09-4128-92cc-3e19fa00f911";
  
  console.log("--- TESTANDO CONEXÕES GOOGLE PARA O RELATÓRIO FELIPE GOUVEIA ---");
  
  try {
    console.log("\n1. Testando GA4:");
    const ga4 = await listGa4PropertiesForReport(userId, reportId);
    console.log(`GA4 Properties found: ${ga4.properties.length}`);
    ga4.properties.slice(0, 3).forEach(p => console.log(` - ${p.displayName} (${p.propertyId}) [${p.account}]`));
  } catch (e) {
    console.error("GA4 Error:", e.message);
  }

  try {
    console.log("\n2. Testando GSC:");
    const gsc = await listGscSitesForReport(userId, reportId);
    console.log(`GSC Sites found: ${gsc.sites.length}`);
    gsc.sites.slice(0, 3).forEach(s => console.log(` - ${s.siteUrl} (${s.permissionLevel})`));
  } catch (e) {
    console.error("GSC Error:", e.message);
  }

  try {
    console.log("\n3. Testando Google Ads:");
    const gads = await listGoogleAdsCustomersForReport(userId, reportId);
    console.log(`GAds Customers found: ${gads.customers.length}`);
    gads.customers.slice(0, 3).forEach(c => console.log(` - ${c.descriptiveName} (${c.customerId})`));
  } catch (e) {
    console.error("GAds Error:", e.message);
  }
}

test();

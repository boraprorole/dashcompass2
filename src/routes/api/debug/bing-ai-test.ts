import { createFileRoute } from "@tanstack/react-router";

/**
 * ROTA TEMPORÁRIA DE DIAGNÓSTICO.
 *
 * Objetivo: verificar se o endpoint interno do Bing AI Performance
 * (`/webmasters/api/aiperformance/citationstats`) aceita autenticação
 * OAuth (Bearer) em vez de cookies + CSRF.
 *
 * Nenhuma interpretação é feita: a resposta bruta (status, headers, body,
 * URL final, redirects e tempo) é devolvida integralmente.
 */

const TARGET_URL = "https://www.bing.com/webmasters/api/aiperformance/citationstats";

const DEFAULT_SITE_URL = "https://boraprorole.com.br/";
const DEFAULT_BEGIN = "Mon, 04 May 2026 00:00:00 GMT";
const DEFAULT_END = "Mon, 03 Aug 2026 00:00:00 GMT";

function headersToObject(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

export const Route = createFileRoute("/api/debug/bing-ai-test")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const startedAt = Date.now();

        // ---- 1. Entrada opcional (reportId / siteUrl / datas) --------------
        let input: {
          reportId?: string;
          siteUrl?: string;
          beginTimeStamp?: string;
          endTimeStamp?: string;
        } = {};
        try {
          const raw = await request.text();
          if (raw.trim()) input = JSON.parse(raw);
        } catch {
          // corpo inválido é ignorado — usamos os defaults
        }

        const siteUrl = input.siteUrl ?? DEFAULT_SITE_URL;

        // ---- 2. Recuperar o refresh_token da integração Bing conectada -----
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        let query = supabaseAdmin
          .from("bing_connections")
          .select("report_id, refresh_token, site_url")
          .not("refresh_token", "is", null)
          .limit(1);

        if (input.reportId) {
          query = query.eq("report_id", input.reportId);
        } else if (input.siteUrl) {
          query = query.eq("site_url", input.siteUrl);
        }

        const { data: conns, error: dbError } = await query;
        const conn = conns?.[0];

        if (dbError || !conn?.refresh_token) {
          return Response.json(
            {
              ok: false,
              stage: "lookup_connection",
              message: dbError?.message ?? "Nenhuma conexão Bing com refresh_token encontrada",
              reportId: input.reportId ?? null,
              siteUrl,
            },
            { status: 200 },
          );
        }

        // ---- 3. Trocar refresh_token por access_token ----------------------
        let accessToken: string;
        try {
          const { getBingAccessToken } = await import("@/lib/bing_picker.server");
          accessToken = await getBingAccessToken(conn.refresh_token);
        } catch (err) {
          return Response.json(
            {
              ok: false,
              stage: "refresh_access_token",
              message: err instanceof Error ? err.message : String(err),
            },
            { status: 200 },
          );
        }

        // ---- 4. Chamada crua ao endpoint interno ---------------------------
        const payload = {
          SiteUrl: siteUrl,
          DateRange: {
            BeginTimeStamp: input.beginTimeStamp ?? DEFAULT_BEGIN,
            EndTimeStamp: input.endTimeStamp ?? DEFAULT_END,
          },
          Page: "",
          Query: "",
        };

        const sentHeaders: Record<string, string> = {
          Authorization: `Bearer ${accessToken}`,
          Origin: "https://www.bing.com",
          Referer: `https://www.bing.com/webmasters/aiperformance?siteUrl=${siteUrl}`,
          Accept: "application/json, text/javascript, */*; q=0.01",
          "Content-Type": "application/json;charset=UTF-8",
          "User-Agent": "Mozilla/5.0",
          "X-Requested-With": "XMLHttpRequest",
        };


        const loggedHeaders = { ...sentHeaders, Authorization: "Bearer <omitido>" };

        console.log("[BING AI TEST] URL:", TARGET_URL);
        console.log("[BING AI TEST] HEADERS ENVIADOS:", JSON.stringify(loggedHeaders));
        console.log("[BING AI TEST] PAYLOAD:", JSON.stringify(payload));

        let res: Response;
        try {
          res = await fetch(TARGET_URL, {
            method: "POST",
            headers: sentHeaders,
            body: JSON.stringify(payload),
            redirect: "follow",
          });
        } catch (err) {
          const durationMs = Date.now() - startedAt;
          console.error("[BING AI TEST] FALHA DE REDE:", err);
          return Response.json(
            {
              ok: false,
              stage: "fetch",
              message: err instanceof Error ? err.message : String(err),
              durationMs,
              requestUrl: TARGET_URL,
              requestHeaders: loggedHeaders,
              requestBody: payload,
            },
            { status: 200 },
          );
        }

        const body = await res.text();
        const durationMs = Date.now() - startedAt;
        const responseHeaders = headersToObject(res.headers);

        console.log("[BING AI TEST] STATUS:", res.status, res.statusText);
        console.log("[BING AI TEST] URL FINAL:", res.url);
        console.log("[BING AI TEST] RESPONSE HEADERS:", JSON.stringify(responseHeaders));
        console.log("[BING AI TEST] RESPONSE BODY:", body);

        const contentType = res.headers.get("content-type") ?? "";
        const isJson = contentType.includes("json");
        let parsedJson: unknown = null;
        if (isJson) {
          try {
            parsedJson = JSON.parse(body);
          } catch {
            parsedJson = null;
          }
        }

        return Response.json(
          {
            ok: true,
            durationMs,
            request: {
              url: TARGET_URL,
              method: "POST",
              headers: loggedHeaders,
              body: payload,
            },
            response: {
              status: res.status,
              statusText: res.statusText,
              finalUrl: res.url,
              redirected: res.redirected,
              contentType,
              headers: responseHeaders,
              bodyIsHtml: /^\s*<(!doctype|html)/i.test(body),
              body,
              json: parsedJson,
            },
            connection: {
              reportId: conn.report_id,
              siteUrl: conn.site_url,
            },
          },
          { status: 200 },
        );
      },
    },
  },
});

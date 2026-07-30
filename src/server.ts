import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => ((m as { default?: ServerEntry }).default ?? (m as unknown as ServerEntry)),
    );
  }
  return serverEntryPromise;
}

function brandedErrorResponse(): Response {
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isCatastrophicSsrErrorBody(body: string, responseStatus: number): boolean {
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return false;
  }

  if (!payload || Array.isArray(payload) || typeof payload !== "object") {
    return false;
  }

  const fields = payload as Record<string, unknown>;
  const expectedKeys = new Set(["message", "status", "unhandled"]);
  if (!Object.keys(fields).every((key) => expectedKeys.has(key))) {
    return false;
  }

  return (
    fields.unhandled === true &&
    fields.message === "HTTPError" &&
    (fields.status === undefined || fields.status === responseStatus)
  );
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
//
// IMPORTANT: this only replaces the response with the branded HTML error page
// for real browser page navigations (Accept: text/html). Data calls made by
// the client — e.g. TanStack Start server functions (useServerFn) — expect a
// JSON response. If we hand them HTML here, JSON.parse() on the client blows
// up with a confusing "Unexpected token '<'" error and the real cause is lost.
async function normalizeCatastrophicSsrResponse(request: Request, response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isCatastrophicSsrErrorBody(body, response.status)) {
    return response;
  }

  const realError = consumeLastCapturedError();
  console.error(realError ?? new Error(`h3 swallowed SSR error: ${body}`));

  const acceptsHtml = (request.headers.get("accept") ?? "").includes("text/html");
  if (!acceptsHtml) {
    // Data/server-function call: surface the real error message as JSON
    // instead of swapping in an HTML page.
    const message = realError instanceof Error ? realError.message : "Erro interno do servidor";
    return new Response(JSON.stringify({ error: message, message }), {
      status: response.status,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }

  return brandedErrorResponse();
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(request, response);
    } catch (error) {
      console.error(error);
      const acceptsHtml = (request.headers.get("accept") ?? "").includes("text/html");
      if (!acceptsHtml) {
        const message = error instanceof Error ? error.message : "Erro interno do servidor";
        return new Response(JSON.stringify({ error: message, message }), {
          status: 500,
          headers: { "content-type": "application/json; charset=utf-8" },
        });
      }
      return brandedErrorResponse();
    }
  },
};

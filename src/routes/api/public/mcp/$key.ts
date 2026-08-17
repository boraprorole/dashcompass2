import { createFileRoute } from "@tanstack/react-router";
import { ToolContext } from "@lovable.dev/mcp-js";
import { zodToJsonSchema } from "zod-to-json-schema";
import { z } from "zod";
import mcp from "@/lib/mcp/index";

/**
 * Endpoint MCP com "link já autenticado".
 *
 * A chave de acesso (`dcmcp_…`) vai no próprio path ou no header
 * `Authorization: Bearer …`. A chave É a credencial — quem tiver o link
 * acessa os relatórios do dono da chave até que ela seja revogada no
 * Admin Agência → MCP.
 *
 * A execução continua sob a RLS do dono: resolvemos a chave para um access
 * token real daquele usuário e as tools usam esse token normalmente.
 */

const PROTOCOL_VERSION = "2025-06-18";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, mcp-protocol-version",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function rpcError(id: unknown, code: number, message: string) {
  return json({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });
}

function toolListPayload() {
  return mcp.tools.map((tool) => ({
    name: tool.name,
    title: tool.title,
    description: tool.description,
    annotations: tool.annotations,
    inputSchema: tool.inputSchema
      ? zodToJsonSchema(z.object(tool.inputSchema as z.ZodRawShape), { $refStrategy: "none" })
      : { type: "object", properties: {} },
  }));
}

/** Remove do payload de `list_my_reports` tudo que estiver fora do escopo. */
function filterReportsResult(result: unknown, allowedReportIds: string[]) {
  const r = result as {
    isError?: boolean;
    structuredContent?: { reports?: Array<{ id?: string }> };
    content?: Array<{ type: string; text?: string }>;
  };
  const reports = r?.structuredContent?.reports;
  if (r?.isError || !Array.isArray(reports)) return result;

  const filtered = reports.filter((rep) => allowedReportIds.includes(String(rep?.id)));
  return {
    ...r,
    structuredContent: { ...r.structuredContent, reports: filtered },
    content: [{ type: "text", text: JSON.stringify(filtered, null, 2) }],
  };
}

export const Route = createFileRoute("/api/public/mcp/$key")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),

      GET: async () =>
        json({ ok: true, transport: "streamable-http", note: "Use POST (JSON-RPC 2.0)." }),

      POST: async ({ request, params }) => {
        const headerKey = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
        const rawKey = params.key && params.key !== "key" ? params.key : headerKey;

        let payload: unknown;
        try {
          payload = await request.json();
        } catch {
          return rpcError(null, -32700, "Parse error");
        }

        const msg = payload as { id?: unknown; method?: string; params?: Record<string, unknown> };
        const method = msg.method;

        // Notificações não esperam resposta.
        if (typeof method === "string" && method.startsWith("notifications/")) {
          return new Response(null, { status: 202, headers: corsHeaders });
        }

        if (method === "initialize") {
          return json({
            jsonrpc: "2.0",
            id: msg.id ?? null,
            result: {
              protocolVersion: PROTOCOL_VERSION,
              capabilities: { tools: { listChanged: false } },
              serverInfo: { name: mcp.name, title: mcp.title, version: mcp.version },
              instructions: mcp.instructions,
            },
          });
        }

        if (method === "ping") return json({ jsonrpc: "2.0", id: msg.id ?? null, result: {} });

        if (method === "tools/list") {
          return json({ jsonrpc: "2.0", id: msg.id ?? null, result: { tools: toolListPayload() } });
        }

        if (method !== "tools/call") {
          return rpcError(msg.id, -32601, `Method not found: ${String(method)}`);
        }

        // A partir daqui é necessário credencial válida.
        const { resolveMcpKey } = await import("@/lib/mcp-keys.server");
        let resolved: Awaited<ReturnType<typeof resolveMcpKey>> = null;
        try {
          resolved = await resolveMcpKey(rawKey ?? "");
        } catch (err) {
          console.error("[mcp-keyed] falha ao resolver chave:", err);
          return rpcError(msg.id, -32000, "Não foi possível autenticar a chave de acesso.");
        }
        if (!resolved) return rpcError(msg.id, -32001, "Chave de acesso inválida ou revogada.");

        // Escopo por empresa: a chave só enxerga relatórios daquela empresa.
        let allowedReportIds: string[] | null = null;
        if (resolved.companyId) {
          const { listCompanyReportIds } = await import("@/lib/mcp-keys.server");
          try {
            allowedReportIds = await listCompanyReportIds(resolved.companyId);
          } catch (err) {
            console.error("[mcp-keyed] falha ao resolver escopo da empresa:", err);
            return rpcError(msg.id, -32000, "Não foi possível resolver o escopo da chave.");
          }
        }

        const toolName = (msg.params?.name ?? "") as string;
        const tool = mcp.tools.find((t) => t.name === toolName);
        if (!tool) return rpcError(msg.id, -32602, `Unknown tool: ${toolName}`);

        const args = (msg.params?.arguments ?? {}) as Record<string, unknown>;

        // Valida a entrada com o mesmo schema Zod usado no fluxo OAuth.
        let parsedArgs: Record<string, unknown> = args;
        if (tool.inputSchema) {
          const parsed = z.object(tool.inputSchema as z.ZodRawShape).safeParse(args);
          if (!parsed.success) {
            return json({
              jsonrpc: "2.0",
              id: msg.id ?? null,
              result: {
                isError: true,
                content: [{ type: "text", text: `Entrada inválida: ${parsed.error.message}` }],
              },
            });
          }
          parsedArgs = parsed.data as Record<string, unknown>;
        }

        // Bloqueia acesso a relatórios fora do escopo da chave.
        if (allowedReportIds) {
          const requested = parsedArgs["report_id"] ?? parsedArgs["reportId"];
          if (typeof requested === "string" && !allowedReportIds.includes(requested)) {
            return json({
              jsonrpc: "2.0",
              id: msg.id ?? null,
              result: {
                isError: true,
                content: [
                  {
                    type: "text",
                    text: "Este link MCP está restrito a uma empresa e não tem acesso a este relatório. Use `list_my_reports` para ver os relatórios disponíveis.",
                  },
                ],
              },
            });
          }
        }

        const ctx = new ToolContext({
          type: "oauth",
          principal: {
            claims: { sub: resolved.userId, email: resolved.email, aud: "authenticated" },
            issuer: `${process.env.SUPABASE_URL ?? ""}/auth/v1`,
            resource: new URL(request.url).origin,
            acceptedAudiences: ["authenticated"],
            scopes: [],
            sub: resolved.userId,
            email: resolved.email,
            clientId: "dashcompass-keyed-link",
          },
          bearer: { token: resolved.accessToken },
        });

        try {
          const result = await tool.handler(parsedArgs, ctx);
          const scoped =
            allowedReportIds && toolName === "list_my_reports"
              ? filterReportsResult(result, allowedReportIds)
              : result;
          return json({ jsonrpc: "2.0", id: msg.id ?? null, result: scoped });
        } catch (err) {
          console.error(`[mcp-keyed] erro na tool ${toolName}:`, err);
          return json({
            jsonrpc: "2.0",
            id: msg.id ?? null,
            result: {
              isError: true,
              content: [{ type: "text", text: "Erro ao executar a ferramenta." }],
            },
          });
        }
      },
    },
  },
});

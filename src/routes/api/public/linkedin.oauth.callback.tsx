import { createFileRoute } from "@tanstack/react-router";
import {
  exchangeLinkedInCode,
  listAdminOrganizations,
  saveLinkedInConnection,
  verifyLinkedInState,
} from "@/lib/linkedin.server";

function html(body: string, status = 200) {
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"><title>LinkedIn</title>
<style>body{font-family:system-ui,-apple-system,sans-serif;background:#0f0f10;color:#f5f5f5;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:2rem}
.card{max-width:520px;background:#1a1a1c;border:1px solid #2a2a2c;border-radius:16px;padding:2rem;text-align:center}
h1{margin:0 0 .75rem;font-size:1.25rem}p{color:#aaa;margin:.5rem 0 1.5rem;font-size:.9rem}
a{color:#c25b5b;text-decoration:none;font-weight:500}</style></head>
<body><div class="card">${body}</div></body></html>`,
    { status, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

export const Route = createFileRoute("/api/public/linkedin/oauth/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const error = url.searchParams.get("error");
        const errorDescription = url.searchParams.get("error_description");
        if (error)
          return html(
            `<h1>Autorização negada</h1><p>${error}${errorDescription ? ` — ${errorDescription}` : ""}</p><a href="/admin">Voltar</a>`,
            400,
          );
        if (!code || !state)
          return html(`<h1>Parâmetros ausentes</h1><a href="/admin">Voltar</a>`, 400);
        try {
          const parsed = (await verifyLinkedInState(state)) as { reportId?: string };
          if (!parsed.reportId) throw new Error("state incompleto");

          const tokens = await exchangeLinkedInCode(code);
          const orgs = await listAdminOrganizations(tokens.access_token);
          if (orgs.length === 0) {
            return html(
              `<h1>Nenhuma Company Page encontrada</h1><p>Este usuário não é ADMINISTRATOR aprovado de nenhuma Company Page. Peça acesso na página do LinkedIn e tente novamente.</p><a href="/admin">Voltar</a>`,
              400,
            );
          }
          // Passo 1: pega a primeira Company Page administrada.
          // (Se houver várias, podemos evoluir pra tela de escolha depois.)
          const org = orgs[0];
          await saveLinkedInConnection({
            reportId: parsed.reportId,
            tokens,
            organization: { urn: org.urn, name: org.name },
          });
          const extra = orgs.length > 1
            ? `<p><em>Foram encontradas ${orgs.length} páginas administradas. Vinculamos "${org.name ?? org.urn}". Se for a errada, remova e reconecte com outra conta.</em></p>`
            : "";
          return html(
            `<h1>LinkedIn conectado</h1><p>Company Page vinculada: <strong>${org.name ?? org.urn}</strong>.</p>${extra}<a href="/admin">Voltar ao admin</a>`,
          );
        } catch (e) {
          return html(
            `<h1>Erro ao conectar</h1><p>${(e as Error).message}</p><a href="/admin">Voltar</a>`,
            500,
          );
        }
      },
    },
  },
});

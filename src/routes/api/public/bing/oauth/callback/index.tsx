import { createFileRoute } from "@tanstack/react-router";
import { exchangeBingCode, saveBingConnection } from "@/lib/bing_auth.server";
import { verifyState } from "@/lib/ga.server";

function html(body: string, status = 200) {
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"><title>Bing Connect</title>
<style>body{font-family:system-ui,-apple-system,sans-serif;background:#0f0f10;color:#f5f5f5;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:2rem}
.card{max-width:520px;background:#1a1a1c;border:1px solid #2a2a2c;border-radius:16px;padding:2rem;text-align:center}
h1{margin:0 0 .75rem;font-size:1.25rem}p{color:#aaa;margin:.5rem 0 1.5rem;font-size:.9rem}
a{color:#c25b5b;text-decoration:none;font-weight:500}</style></head>
<body><div class="card">${body}</div></body></html>`,
    { status, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

export const Route = createFileRoute("/api/public/bing/oauth/callback/")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const error = url.searchParams.get("error");
        
        if (error) return html(`<h1>Autorização negada</h1><p>${error}</p><a href="/admin">Voltar</a>`, 400);
        if (!code || !state) return html(`<h1>Parâmetros ausentes</h1><a href="/admin">Voltar</a>`, 400);

        try {
          let parsed: { reportId?: string; userId?: string } = {};

          try {
            if (state.includes(".")) {
              parsed = (await verifyState(state)) as { reportId?: string; userId?: string };
            } else {
              parsed = JSON.parse(atob(state));
            }
          } catch (e) {
            console.error("Bing State parse error:", e);
            throw new Error("Estado de autenticação inválido.");
          }

          if (!parsed.reportId || !parsed.userId) throw new Error("Parâmetros do relatório ausentes no estado.");

          const tokens = await exchangeBingCode(code);
          
          await saveBingConnection({
            reportId: parsed.reportId,
            refreshToken: tokens.refresh_token,
            siteUrl: "Aguardando sincronização..."
          });

          return html(
            `<h1>Bing Conectado</h1><p>Sua conta do Bing Webmaster foi vinculada com sucesso.</p><a href="/admin">Voltar ao admin</a>`,
          );
        } catch (e) {
          return html(
            `<h1>Erro ao conectar Bing</h1><p>${(e as Error).message}</p><a href="/admin">Voltar</a>`,
            500,
          );
        }
      },
    },
  },
});

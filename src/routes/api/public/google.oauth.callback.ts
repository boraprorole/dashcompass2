import { createFileRoute } from "@tanstack/react-router";
import { exchangeCode, fetchGoogleEmail, verifyState } from "@/lib/ga.server";
import { saveGscConnection } from "@/lib/gsc.server";
import { saveGadsConnection } from "@/lib/gads.server";
import { saveOauthConnection } from "@/lib/ga.server";
import { getGoogleRedirectUri } from "@/lib/google_auth.server";

function html(body: string, status = 200) {
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"><title>Google Connect</title>
<style>body{font-family:system-ui,-apple-system,sans-serif;background:#0f0f10;color:#f5f5f5;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:2rem}
.card{max-width:520px;background:#1a1a1c;border:1px solid #2a2a2c;border-radius:16px;padding:2rem;text-align:center}
h1{margin:0 0 .75rem;font-size:1.25rem}p{color:#aaa;margin:.5rem 0 1.5rem;font-size:.9rem}
a{color:#c25b5b;text-decoration:none;font-weight:500}</style></head>
<body><div class="card">${body}</div></body></html>`,
    { status, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

export const Route = createFileRoute("/api/public/google/oauth/callback")({
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
          // Re-using GA verifyState since logic is identical for now
          const parsed = (await verifyState(state)) as { reportId?: string; userId?: string };
          if (!parsed.reportId || !parsed.userId) throw new Error("state incompleto");
          
          const tokens = await exchangeCode(code, url.origin);
          if (!tokens.refresh_token) {
            return html(
              `<h1>Refresh token não retornado</h1><p>Remova o acesso em <a href="https://myaccount.google.com/permissions" target="_blank">myaccount.google.com/permissions</a> e tente conectar novamente.</p><a href="/admin">Voltar</a>`,
              400,
            );
          }
          
          const email = await fetchGoogleEmail(tokens.access_token);
          
          // Save to all 3 tables (GA4, GSC, GAds) to fulfill the unified request
          await Promise.all([
            saveOauthConnection({
              userId: parsed.userId,
              reportId: parsed.reportId,
              refreshToken: tokens.refresh_token,
              googleEmail: email,
            }),
            saveGscConnection({
              userId: parsed.userId,
              reportId: parsed.reportId,
              refreshToken: tokens.refresh_token,
              googleEmail: email,
            }),
            saveGadsConnection({
              userId: parsed.userId,
              reportId: parsed.reportId,
              refreshToken: tokens.refresh_token,
              googleEmail: email,
            })
          ]);

          return html(
            `<h1>Google Conectado</h1><p>${email ?? "Conta Google"} vinculada com sucesso ao GA4, Search Console e Google Ads.</p><a href="/admin">Voltar ao admin</a>`,
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

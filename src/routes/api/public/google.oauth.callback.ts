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
          // Detect provider from state
          let provider = "google";
          let parsed: { reportId?: string; userId?: string } = {};

          try {
            // Try parsing as Bing state (Simple B64) or Google state (HMAC signed)
            if (state.includes(".")) {
              parsed = (await verifyState(state)) as { reportId?: string; userId?: string };
            } else {
              const decoded = JSON.parse(atob(state));
              parsed = decoded;
              provider = decoded.provider || "google";
            }
          } catch (e) {
            console.error("State parse error:", e);
          }

          if (!parsed.reportId || !parsed.userId) throw new Error("state incompleto ou inválido");
          
          if (provider === "bing") {
            const { exchangeBingCode, saveBingConnection } = await import("@/lib/bing_auth.server");
            const tokens = await exchangeBingCode(code);
            
            // For Bing, we might need a default site URL or fetch it later. 
            // For now, we save what we have.
            await saveBingConnection({
              reportId: parsed.reportId,
              refreshToken: tokens.refresh_token,
              siteUrl: "https://bing-connected.waiting-selection.com"
            });

            return html(
              `<h1>Bing Conectado</h1><p>Sua conta Microsoft foi vinculada com sucesso.</p><a href="/admin">Voltar ao admin</a>`,
            );
          }

          const tokens = await exchangeCode(code, url.origin, getGoogleRedirectUri());
          if (!tokens.refresh_token) {
            return html(
              `<h1>Refresh token não retornado</h1><p>Remova o acesso em <a href="https://myaccount.google.com/permissions" target="_blank">myaccount.google.com/permissions</a> e tente conectar novamente.</p><a href="/admin">Voltar</a>`,
              400,
            );
          }
          
          const email = await fetchGoogleEmail(tokens.access_token);
          
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

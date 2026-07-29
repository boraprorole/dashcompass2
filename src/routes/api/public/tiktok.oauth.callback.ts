import { createFileRoute } from '@tanstack/react-router';
import { exchangeTiktokCode, saveTiktokConnection } from '@/lib/tiktok.server';

function html(body: string, status = 200) {
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"><title>TikTok Connect</title>
<style>body{font-family:system-ui,-apple-system,sans-serif;background:#0f0f10;color:#f5f5f5;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:2rem}
.card{max-width:520px;background:#1a1a1c;border:1px solid #2a2a2c;border-radius:16px;padding:2rem;text-align:center}
h1{margin:0 0 .75rem;font-size:1.25rem}p{color:#aaa;margin:.5rem 0 1.5rem;font-size:.9rem}
a{color:#3DFC03;text-decoration:none;font-weight:500}</style></head>
<body><div class="card">${body}</div></body></html>`,
    { status, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

export const Route = createFileRoute('/api/public/tiktok/oauth/callback')({
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
          const decodedState = JSON.parse(atob(state));
          const { reportId } = decodedState;

          const tokens = await exchangeTiktokCode(code);
          
          // Salva o primeiro advertiser_id disponível como padrão se houver
          const advertiserId = tokens.advertiser_ids?.[0];

          await saveTiktokConnection({
            reportId,
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            advertiserId
          });

          return html(
            `<h1>TikTok Conectado</h1><p>Sua conta TikTok Ads foi vinculada com sucesso ao relatório.</p><a href="/admin?reportId=${reportId}">Voltar ao admin</a>`,
          );
        } catch (e) {
          console.error('TikTok OAuth Error:', e);
          return html(
            `<h1>Tiktok deu Error</h1><p>There seems to be an issue getting user information associated with your account or the authorization application. Please contact our support for further assistance.</p><a href="/admin">Voltar</a>`,
            500,
          );
        }
      },
    },
  },
});

import { createFileRoute } from "@tanstack/react-router";
import {
  exchangeMetaCode,
  exchangeForLongLivedToken,
  discoverMetaAssets,
  getFacebookMe,
  saveMetaConnection,
  verifyMetaState,
} from "@/lib/meta.server";

function html(body: string, status = 200) {
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"><title>Meta OAuth</title>
<style>body{font-family:system-ui,-apple-system,sans-serif;background:#0f0f10;color:#f5f5f5;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:2rem}
.card{max-width:560px;background:#1a1a1c;border:1px solid #2a2a2c;border-radius:16px;padding:2rem;text-align:center}
h1{margin:0 0 .75rem;font-size:1.25rem}p{color:#aaa;margin:.5rem 0 1rem;font-size:.9rem}
ul{text-align:left;color:#ccc;font-size:.85rem;margin:.5rem 0 1rem;padding-left:1.25rem}
a{color:#c25b5b;text-decoration:none;font-weight:500}</style></head>
<body><div class="card">${body}</div></body></html>`,
    { status, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

export const Route = createFileRoute("/api/public/meta/oauth/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const error = url.searchParams.get("error");
        const errorDescription = url.searchParams.get("error_description");

        if (error) {
          return html(
            `<h1>Autorização negada</h1><p>${error}${errorDescription ? ` — ${errorDescription}` : ""}</p><a href="/conexoes">Voltar</a>`,
            400,
          );
        }
        if (!code || !state) {
          return html(`<h1>Parâmetros ausentes</h1><a href="/conexoes">Voltar</a>`, 400);
        }

        try {
          const parsed = (await verifyMetaState(state)) as {
            reportId?: string;
            userId?: string;
          };
          if (!parsed.reportId || !parsed.userId) throw new Error("state incompleto");

          const short = await exchangeMetaCode(code);
          const long = await exchangeForLongLivedToken(short.access_token);
          const fbUser = await getFacebookMe(long.access_token);

          const { discovered, preSelected } = await discoverMetaAssets(long.access_token);

          await saveMetaConnection({
            reportId: parsed.reportId,
            userId: parsed.userId,
            longToken: long,
            fbUser,
            discovered,
            selection: preSelected,
          });

          const pageList = discovered.pages.length
            ? `<ul>${discovered.pages
                .map(
                  (p) =>
                    `<li><strong>${p.name}</strong>${p.instagram ? ` — Instagram: @${p.instagram.username ?? p.instagram.id}` : ""}</li>`,
                )
                .join("")}</ul>`
            : `<p><em>Nenhuma Página do Facebook encontrada nesta conta.</em></p>`;

          const adList = discovered.ad_accounts.length
            ? `<p>Contas de anúncios encontradas: <strong>${discovered.ad_accounts.length}</strong></p>`
            : `<p><em>Nenhuma conta de anúncios (ads_read) disponível.</em></p>`;

          return html(
            `<h1>Meta conectado ✅</h1>
             <p>Conexão salva como <strong>${fbUser.name}</strong>.</p>
             ${pageList}${adList}
             <a href="/conexoes">Voltar para Conexões</a>`,
          );
        } catch (e) {
          return html(
            `<h1>Erro ao conectar</h1><p>${(e as Error).message}</p><a href="/conexoes">Voltar</a>`,
            500,
          );
        }
      },
    },
  },
});

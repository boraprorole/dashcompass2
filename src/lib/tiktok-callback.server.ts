import { exchangeTiktokCode, fetchTiktokUserInfo, saveTiktokConnection } from "./tiktok.server";

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

type TiktokOAuthState = {
  reportId?: string;
  userId?: string;
};

type ValidTiktokOAuthState = {
  reportId: string;
  userId?: string;
};

function parseTiktokState(state: string): ValidTiktokOAuthState {
  const parsed = JSON.parse(atob(state)) as TiktokOAuthState;

  if (!parsed.reportId) {
    throw new Error("state sem reportId");
  }

  return { reportId: parsed.reportId, userId: parsed.userId };
}

export async function handleTiktokOAuthCallback(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) return html(`<h1>Autorização negada</h1><p>${error}</p><a href="/admin">Voltar</a>`, 400);
  if (!code || !state) return html(`<h1>Parâmetros ausentes</h1><a href="/admin">Voltar</a>`, 400);

  try {
    const { reportId } = parseTiktokState(state);
    const tokens = await exchangeTiktokCode(code);
    const user = await fetchTiktokUserInfo(tokens.access_token!).catch(() => ({}));

    await saveTiktokConnection({
      reportId,
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token!,
      openId: tokens.open_id || user.open_id,
      displayName: user.display_name,
    });

    return html(
      `<h1>TikTok Conectado</h1><p>Conta TikTok (${user.display_name ?? "orgânica"}) vinculada com sucesso ao relatório.</p><a href="/admin?reportId=${reportId}">Voltar ao admin</a>`,
    );
  } catch (e) {
    console.error("TikTok OAuth Error:", e);
    return html(
      `<h1>Erro ao conectar TikTok</h1><p>${(e as Error).message}</p><p>Redirect URL: https://dashcompass.com/auth/tiktok/callback</p><a href="/admin">Voltar</a>`,
      500,
    );
  }
}
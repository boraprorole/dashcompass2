import { createFileRoute, redirect } from "@tanstack/react-router";
import { exchangeMetaCode, exchangeForLongLivedToken, getFacebookMe, discoverMetaAssets, saveMetaConnection, verifyMetaState } from "@/lib/meta.server";

export const Route = createFileRoute("/api/public/meta/oauth/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const error = url.searchParams.get("error");
        const error_description = url.searchParams.get("error_description");

        if (error || !code || !state) {
          const msg = error_description || error || "Parâmetros OAuth ausentes";
          return redirect({ to: `/reports?error=${encodeURIComponent(msg)}` });
        }

        try {
          // 1. Verificar state e obter IDs (reportId, userId)
          const { reportId, userId } = (await verifyMetaState(state)) as {
            reportId: string;
            userId: string;
          };

          // 2. Trocar código por token curto
          const shortToken = await exchangeMetaCode(code);

          // 3. Trocar por token de longa duração (60 dias)
          const longToken = await exchangeForLongLivedToken(shortToken.access_token);

          // 4. Obter info do usuário
          const fbUser = await getFacebookMe(longToken.access_token);

          // 5. Descoberta inicial de ativos
          const { discovered, preSelected } = await discoverMetaAssets(longToken.access_token);

          // 6. Salvar conexão
          await saveMetaConnection({
            reportId,
            userId,
            longToken,
            fbUser,
            discovered,
            selection: preSelected,
          });

          // 7. Sucesso! Redirecionar para o admin ou relatório
          return redirect({ to: "/_authenticated/admin?tab=reports&success=meta-connected" });
        } catch (e) {
          console.error("[Meta Callback Error]", e);
          const msg = (e as Error).message || "Falha na integração com Meta";
          return redirect({ to: `/_authenticated/admin?tab=reports&error=${encodeURIComponent(msg)}` });
        }
      },
    },
  },
});

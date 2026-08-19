import { createFileRoute } from "@tanstack/react-router";
import {
  verifyInstagramState,
  exchangeInstagramCode,
  exchangeInstagramLongLived,
  getInstagramMe,
  saveInstagramConnection,
} from "@/lib/instagram_login.server";

export const Route = createFileRoute("/api/public/instagram/oauth/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const error = url.searchParams.get("error");
        const errorDescription = url.searchParams.get("error_description");

        const redirect = (location: string) =>
          new Response(null, { status: 302, headers: { Location: location } });

        if (error || !code || !state) {
          const msg = errorDescription || error || "Parâmetros OAuth ausentes";
          return redirect(`/admin?tab=reports&error=${encodeURIComponent(msg)}`);
        }

        try {
          const { reportId, userId } = await verifyInstagramState(state);
          const shortToken = await exchangeInstagramCode(code);
          const longToken = await exchangeInstagramLongLived(shortToken.access_token);
          const me = await getInstagramMe(longToken.access_token);
          await saveInstagramConnection({ reportId, userId, longToken, me });
          return redirect("/admin?tab=reports&success=instagram-connected");
        } catch (e) {
          console.error("[Instagram Login Callback Error]", e);
          const msg = (e as Error).message || "Falha na integração com Instagram";
          return redirect(`/admin?tab=reports&error=${encodeURIComponent(msg)}`);
        }
      },
    },
  },
});

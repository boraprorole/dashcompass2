import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/auth/tiktok/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { handleTiktokOAuthCallback } = await import("@/lib/tiktok-callback.server");
        return handleTiktokOAuthCallback(request);
      },
    },
  },
});
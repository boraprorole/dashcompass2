import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  Link,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { AuthProvider } from "@/hooks/useAuth";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="glass-strong max-w-md rounded-2xl p-10 text-center">
        <h1 className="text-7xl font-bold text-primary">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A página que você procura não existe ou foi movida.
        </p>
        <Link
          to="/" search={{ lang: 'pt' }}
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
        >
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="glass-strong max-w-md rounded-2xl p-10 text-center">
        <h1 className="text-xl font-semibold">Algo deu errado</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tente novamente ou volte para a tela inicial.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Tentar novamente
          </button>
          <a href="/" className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent">
            Início
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "DashCompass — Marketing Data Integration & Dashboard Platform" },
      { name: "description", content: "DashCompass is a professional marketing data integration platform. We unify Google Ads, Google Search Console, and Meta metrics into high-impact dashboards and AI-powered insights for agencies and businesses." },
      { property: "og:title", content: "DashCompass — Marketing Data Integration & Dashboard Platform" },
      { name: "twitter:title", content: "DashCompass — Marketing Data Integration & Dashboard Platform" },
      { property: "og:description", content: "DashCompass is a professional marketing data integration platform. We unify Google Ads, Google Search Console, and Meta metrics into high-impact dashboards and AI-powered insights for agencies and businesses." },
      { name: "twitter:description", content: "DashCompass is a professional marketing data integration platform. We unify Google Ads, Google Search Console, and Meta metrics into high-impact dashboards and AI-powered insights for agencies and businesses." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/zBrfJVZJ9YfqHDasQEb3ewlmrej1/social-images/social-1784924200703-dashcompass-logo-black-16-9.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/zBrfJVZJ9YfqHDasQEb3ewlmrej1/social-images/social-1784924200703-dashcompass-logo-black-16-9.webp" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "stylesheet", href: appCss }, { rel: "icon", type: "image/x-icon", href: "/favicon.ico" }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head><HeadContent /></head>
      <body className="bg-dot-grid">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

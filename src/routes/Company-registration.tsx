import { createFileRoute } from "@tanstack/react-router";
import { RegistrationFlow } from "@/components/registration/RegistrationFlow";

export const Route = createFileRoute("/Company-registration")({
  validateSearch: (search: Record<string, unknown>) => ({
    lang: (search.lang as "pt" | "en") || "en",
  }),
  head: () => ({
    meta: [
      { title: "Sign up — DashCompass" },
      {
        name: "description",
        content: "Create your DashCompass account, pick a plan and subscribe in minutes.",
      },
      { property: "og:title", content: "Sign up — DashCompass" },
      {
        property: "og:description",
        content: "Create your DashCompass account, pick a plan and subscribe in minutes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RegistrationPage,
});

function RegistrationPage() {
  const { lang } = Route.useSearch();
  return <RegistrationFlow lang={lang} />;
}

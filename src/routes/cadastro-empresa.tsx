import { createFileRoute } from "@tanstack/react-router";
import { RegistrationFlow } from "@/components/registration/RegistrationFlow";

export const Route = createFileRoute("/cadastro-empresa")({
  validateSearch: (search: Record<string, unknown>) => ({
    lang: (search.lang as "pt" | "en") || "pt",
  }),
  head: () => ({
    meta: [
      { title: "Cadastro — DashCompass" },
      {
        name: "description",
        content: "Crie sua conta DashCompass, escolha seu plano e assine em poucos minutos.",
      },
      { property: "og:title", content: "Cadastro — DashCompass" },
      {
        property: "og:description",
        content: "Crie sua conta DashCompass, escolha seu plano e assine em poucos minutos.",
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

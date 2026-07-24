import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/lp")({
  component: LandingPage,
  head: () => ({
    meta: [
      { title: "DashCompass · Inteligência de marca em tempo real" },
      {
        name: "description",
        content:
          "Dashboard de análise em tempo real, presença de marca em IAs generativas e Earned Media de SEO orgânico.",
      },
      { property: "og:title", content: "DashCompass · Inteligência em tempo real" },
      {
        property: "og:description",
        content:
          "Performance, presença em IA e SEO orgânico em um só painel. Decisão com dado, não com achismo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function ZigZagBg() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 opacity-[0.18]"
      style={{
        backgroundImage:
          "repeating-linear-gradient(60deg, #e73648 0 60px, transparent 60px 180px), repeating-linear-gradient(-60deg, #e73648 0 60px, transparent 60px 180px)",
        backgroundSize: "360px 360px",
        maskImage:
          "radial-gradient(ellipse at 50% 40%, black 40%, transparent 85%)",
        WebkitMaskImage:
          "radial-gradient(ellipse at 50% 40%, black 40%, transparent 85%)",
      }}
    />
  );
}

function Nav() {
  return (
    <nav className="relative z-10 flex items-center justify-between px-6 py-6 md:px-14">
      <div className="flex items-baseline gap-3">
        <span className="font-serif text-2xl italic tracking-widest text-white/95">
          DASHCOMPASS
        </span>
        <span className="hidden text-xs uppercase tracking-[0.25em] text-white/60 md:inline">
          dashboard
        </span>
      </div>
      <div className="flex items-center gap-3">
        <a
          href="#beneficios"
          className="hidden text-sm text-white/70 hover:text-white md:inline"
        >
          Benefícios
        </a>
        <a
          href="#modulos"
          className="hidden text-sm text-white/70 hover:text-white md:inline"
        >
          Módulos
        </a>
        <Link
          to="/login"
          className="rounded-full border border-white/30 bg-white/5 px-4 py-2 text-sm text-white backdrop-blur-md transition hover:bg-white/10"
        >
          Entrar
        </Link>
      </div>
    </nav>
  );
}

function Section({
  children,
  className = "",
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={`relative px-6 py-24 md:px-14 md:py-32 ${className}`}>
      {children}
    </section>
  );
}

const modulos = [
  {
    tag: "01",
    title: "Análise em tempo real",
    lead: "Performance",
    body: "Meta Ads, Google Ads, GA4, Search Console e CRM sincronizados. Uma única leitura do funil, do investimento e do que vira receita.",
  },
  {
    tag: "02",
    title: "Presença em IA",
    lead: "AI Visibility",
    body: "Sua marca é citada quando alguém pergunta ao ChatGPT, Gemini, Perplexity? Monitoramos share of voice em modelos generativos e o que dizem sobre você.",
  },
  {
    tag: "03",
    title: "Earned Media & SEO",
    lead: "Autoridade orgânica",
    body: "Cobertura de mídia, clipping em tempo real, ranking orgânico e o valor estimado de PR (EMV). O que a marca conquista sem pagar por mídia.",
  },
  {
    tag: "04",
    title: "Consultoria embarcada",
    lead: "Compass AI",
    body: "Um analista sênior dentro do dashboard. Cruza seus dados, aponta gaps, sugere próximos passos. Não é chatbot — é leitura de negócio.",
  },
];

const beneficios = [
  {
    kicker: "Decisão",
    title: "Do achismo ao dado, em minutos.",
    body: "Sem exportar planilha, sem esperar reunião de sexta. O que está performando aparece — o que não está, também.",
  },
  {
    kicker: "Direção",
    title: "Prioridade clara sobre onde investir.",
    body: "Cruzamos mídia paga com CRM e SEO. Você vê o canal que traz lead barato — e o que traz cliente.",
  },
  {
    kicker: "Distância",
    title: "À frente de quem ainda mede por canal.",
    body: "Presença em IA é o próximo campo de disputa. Chegar depois custa caro.",
  },
];

function LandingPage() {
  return (
    <main className="min-h-screen bg-[#4a0d1c] text-white antialiased">
      {/* HERO */}
      <div className="relative overflow-hidden bg-gradient-to-b from-[#4a0d1c] via-[#5c0f24] to-[#3a0a17]">
        <ZigZagBg />
        <Nav />
        <div className="relative z-10 mx-auto max-w-6xl px-6 pb-32 pt-16 md:px-14 md:pt-24">
          <p className="mb-8 text-xs uppercase tracking-[0.35em] text-white/60">
            / DashCompass Dashboard
          </p>
          <h1 className="max-w-4xl font-serif text-5xl leading-[1.05] tracking-tight md:text-7xl">
            Construindo valor.{" "}
            <span className="italic text-white/90">Decidindo em tempo real.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-white/75 md:text-xl">
            Uma camada de inteligência que reúne performance de mídia, presença
            da marca em IAs generativas e Earned Media de SEO orgânico —
            no mesmo painel.
          </p>
          <div className="mt-12 flex flex-wrap items-center gap-4">
            <Link
              to="/login"
              className="group inline-flex items-center gap-3 rounded-full bg-white px-6 py-3.5 text-sm font-medium text-[#4a0d1c] transition hover:bg-white/90"
            >
              Acessar dashboard
              <span className="transition group-hover:translate-x-1">→</span>
            </Link>
            <a
              href="#modulos"
              className="inline-flex items-center gap-2 rounded-full border border-white/25 px-6 py-3.5 text-sm text-white/90 transition hover:bg-white/5"
            >
              Ver módulos
            </a>
          </div>

          <div className="mt-24 grid grid-cols-2 gap-8 border-t border-white/10 pt-10 md:grid-cols-4">
            {[
              ["+10 anos", "de consultoria"],
              ["7 fontes", "integradas por padrão"],
              ["Tempo real", "sem export de CSV"],
              ["1 painel", "para o C-level"],
            ].map(([a, b]) => (
              <div key={a}>
                <div className="font-serif text-2xl md:text-3xl">{a}</div>
                <div className="mt-1 text-xs uppercase tracking-widest text-white/50">
                  {b}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MANIFESTO */}
      <Section className="bg-[#3a0a17]">
        <div className="mx-auto max-w-5xl">
          <p className="mb-6 text-xs uppercase tracking-[0.35em] text-white/50">
            / Manifesto
          </p>
          <p className="font-serif text-3xl italic leading-snug text-white/90 md:text-5xl">
            Empresas não param de crescer por falta de dado. Param de crescer
            por falta de <span className="not-italic underline decoration-[#e73648] decoration-4 underline-offset-8">leitura</span>.
          </p>
        </div>
      </Section>

      {/* BENEFÍCIOS */}
      <Section id="beneficios" className="bg-[#4a0d1c]">
        <div className="mx-auto max-w-6xl">
          <p className="mb-4 text-xs uppercase tracking-[0.35em] text-white/50">
            / Por que existe
          </p>
          <h2 className="max-w-3xl font-serif text-4xl leading-tight md:text-6xl">
            Um parceiro <span className="italic">de decisão</span>, não mais um relatório.
          </h2>

          <div className="mt-16 grid gap-px overflow-hidden rounded-2xl bg-white/10 md:grid-cols-3">
            {beneficios.map((b) => (
              <div
                key={b.title}
                className="flex flex-col justify-between bg-[#4a0d1c] p-8 md:p-10"
              >
                <div className="text-xs uppercase tracking-[0.3em] text-[#e73648]">
                  / {b.kicker}
                </div>
                <div className="mt-16">
                  <h3 className="font-serif text-2xl leading-snug md:text-3xl">
                    {b.title}
                  </h3>
                  <p className="mt-4 text-sm leading-relaxed text-white/70">
                    {b.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* MÓDULOS */}
      <Section id="modulos" className="bg-[#3a0a17]">
        <div className="mx-auto max-w-6xl">
          <p className="mb-4 text-xs uppercase tracking-[0.35em] text-white/50">
            / O que faz
          </p>
          <h2 className="max-w-3xl font-serif text-4xl leading-tight md:text-6xl">
            Quatro camadas.  <span className="italic">Uma leitura.</span>
          </h2>

          <div className="mt-16 space-y-px overflow-hidden rounded-2xl bg-white/10">
            {modulos.map((m) => (
              <div
                key={m.tag}
                className="group grid grid-cols-1 gap-6 bg-[#3a0a17] p-8 transition hover:bg-[#4a0d1c] md:grid-cols-[80px_200px_1fr] md:items-start md:gap-10 md:p-10"
              >
                <div className="font-serif text-3xl text-[#e73648]">{m.tag}</div>
                <div>
                  <div className="text-xs uppercase tracking-[0.3em] text-white/50">
                    {m.lead}
                  </div>
                  <div className="mt-2 font-serif text-2xl">{m.title}</div>
                </div>
                <p className="text-base leading-relaxed text-white/75 md:text-lg">
                  {m.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* PROCESS */}
      <Section className="bg-[#4a0d1c]">
        <div className="mx-auto max-w-6xl">
          <p className="mb-4 text-xs uppercase tracking-[0.35em] text-white/50">
            / Como funciona
          </p>
          <h2 className="max-w-3xl font-serif text-4xl leading-tight md:text-6xl">
            Conectar. <span className="italic">Ler.</span> Decidir.
          </h2>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {[
              {
                n: "01",
                t: "Conecta as fontes",
                d: "OAuth em Meta, Google Ads, GA4, Search Console, Pipedrive, RD Station. Zero planilha.",
              },
              {
                n: "02",
                t: "Cruza performance × receita",
                d: "Leads pagos viram matrículas, vendas, contratos. Você vê o ROAS de negócio, não só de mídia.",
              },
              {
                n: "03",
                t: "Compass AI aponta o passo",
                d: "Um analista sênior lê tudo isso e te devolve prioridade — no idioma do C-level.",
              },
            ].map((s) => (
              <div key={s.n} className="border-t border-white/20 pt-6">
                <div className="text-xs uppercase tracking-[0.3em] text-[#e73648]">
                  / {s.n}
                </div>
                <h3 className="mt-4 font-serif text-2xl">{s.t}</h3>
                <p className="mt-3 text-sm leading-relaxed text-white/70">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* CTA */}
      <Section className="relative overflow-hidden bg-[#3a0a17]">
        <ZigZagBg />
        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <p className="mb-6 text-xs uppercase tracking-[0.35em] text-white/60">
            / Comece agora
          </p>
          <h2 className="font-serif text-4xl leading-tight md:text-6xl">
            A próxima decisão de marketing{" "}
            <span className="italic">merece contexto.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg text-white/75">
            Ative o DashCompass e transforme dado disperso em direção.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              to="/login"
              className="inline-flex items-center gap-3 rounded-full bg-white px-7 py-4 text-sm font-medium text-[#4a0d1c] transition hover:bg-white/90"
            >
              Acessar dashboard →
            </Link>
          </div>
        </div>
      </Section>

      <footer className="border-t border-white/10 bg-[#2c0710] px-6 py-10 md:px-14">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div className="font-serif text-lg italic tracking-widest">DASHCOMPASS</div>
          <div className="text-xs text-white/50">
            © {new Date().getFullYear()} DashCompass · Marketing estratégico
          </div>
        </div>
      </footer>
    </main>
  );
}

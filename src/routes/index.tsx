import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import bgVideoAsset from "@/assets/homepage-hero-video.mp4.asset.json";
import { ArrowRight, Play, CheckCircle2, ChevronRight, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      lang: (search.lang as string) || "pt",
    };
  },
  head: (context) => {
    // @ts-ignore - search is present at runtime via validateSearch
    const isEn = context.search?.lang === "en";
    return {
      meta: [
        { title: isEn ? "DashCompass — Marketing Data Integration & Dashboard Platform" : "DashCompass — Plataforma de Integração de Dados e Dashboards" },
        { name: "description", content: isEn ? "DashCompass is a professional marketing data integration platform. We unify Google Ads, Google Search Console, and Meta metrics into high-impact dashboards and AI-powered insights for agencies and businesses." : "O DashCompass é uma plataforma profissional de marketing analytics. Nossa finalidade é unificar dados de Google Ads, Google Search Console, Meta e LinkedIn em um único dashboard inteligente." },
        { property: "og:title", content: "DashCompass — Marketing Data Integration & Dashboard Platform" },
        { property: "og:description", content: isEn ? "DashCompass is a professional marketing data integration platform." : "O DashCompass é uma plataforma profissional de marketing analytics." },
      ],
    };
  },
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      // throw redirect({ to: "/reports" });
    }
  },
  component: LandingPage,
});

function LandingPage() {
  const { lang } = Route.useSearch();
  const isEn = lang === "en";
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = isEn ? [
    { name: "Product", href: "#features" },
    { name: "Integrations", href: "#integrations" },
    { name: "AI", href: "#ai" },
    { name: "Pricing", href: "#pricing" },
  ] : [
    { name: "Produto", href: "#features" },
    { name: "Integrações", href: "#integrations" },
    { name: "IA", href: "#ai" },
    { name: "Preços", href: "#pricing" },
  ];

  const plans = isEn ? [
    {
      name: "Starter",
      price: "$29",
      description: "For professionals and small businesses.",
      features: [
        "Up to 1 company",
        "Up to 5 data connections",
        "Real-time dashboard",
        "AI connected to your data",
        "Unlimited reports",
        "Email support",
      ],
      buttonText: "Start now",
      highlight: false,
    },
    {
      name: "Agency",
      price: "$99",
      description: "For growing agencies.",
      features: [
        "Up to 10 companies",
        "Up to 100 connections",
        "White Label",
        "AI for all clients",
        "Unlimited reports",
        "User management",
        "Priority support",
      ],
      buttonText: "Choose Agency",
      highlight: true,
    },
    {
      name: "Agency Pro",
      price: "$249",
      description: "High capacity for teams.",
      features: [
        "Up to 20 companies",
        "Up to 200 connections",
        "Full White Label",
        "Advanced AI*",
        "Influencer management",
        "Report library",
        "API access",
      ],
      buttonText: "Choose Pro",
      highlight: false,
    },
    {
      name: "Enterprise",
      price: "On request",
      description: "Large scale operations.",
      features: [
        "Unlimited companies",
        "Unlimited connections",
        "Enterprise AI",
        "Custom SLA",
        "Success manager",
        "Dedicated infrastructure",
      ],
      buttonText: "Contact sales",
      highlight: false,
    },
  ] : [
    {
      name: "Starter",
      price: "R$ 99",
      description: "Para profissionais e pequenas empresas.",
      features: [
        "Até 1 empresa",
        "Até 5 conexões de dados",
        "Dashboard em tempo real",
        "IA conectada aos seus dados",
        "Relatórios ilimitados",
        "Suporte por e-mail",
      ],
      buttonText: "Começar agora",
      highlight: false,
    },
    {
      name: "Agency",
      price: "R$ 159",
      description: "Para agências em crescimento.",
      features: [
        "Até 10 empresas",
        "Até 100 conexões",
        "White Label",
        "IA para todos os clientes",
        "Relatórios ilimitados",
        "Gestão de usuários",
        "Suporte prioritário",
      ],
      buttonText: "Escolher Agency",
      highlight: true,
    },
    {
      name: "Agency Pro",
      price: "R$ 499",
      description: "Alta capacidade para equipes.",
      features: [
        "Até 20 empresas",
        "Até 200 conexões",
        "White Label completo",
        "IA avançada*",
        "Gestão de influenciadores",
        "Biblioteca de relatórios",
        "API",
      ],
      buttonText: "Escolher Pro",
      highlight: false,
    },
    {
      name: "Enterprise",
      price: "Sob consulta",
      description: "Operações em grande escala.",
      features: [
        "Empresas ilimitadas",
        "Conexões ilimitadas",
        "IA corporativa",
        "SLA personalizado",
        "Gerente de sucesso",
        "Infraestrutura dedicada",
      ],
      buttonText: "Falar com vendas",
      highlight: false,
    },
  ];

  return (
    <div className="relative min-h-screen bg-background text-foreground font-sans selection:bg-primary selection:text-black">
      {/* Language Switcher - Removed from absolute fixed position, now in Nav */}

      {/* Navigation */}
      <nav 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b ${
          scrolled ? "bg-background/80 backdrop-blur-md border-white/5 py-4" : "bg-transparent border-transparent py-6"
        }`}
      >
        <div className="container mx-auto px-6 flex items-center justify-between">
          <Link to="/">
            <Logo iconClassName="h-8 w-8" textClassName="text-xl" />
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a 
                key={link.name} 
                href={link.href} 
                className="text-sm font-medium text-white/60 hover:text-white transition-colors"
              >
                {link.name}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-4">
            <div className="flex bg-white/5 rounded-full p-1 border border-white/10">
              <Link 
                to="/" 
                search={{ lang: 'pt' }}
                className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${!isEn ? "bg-primary text-black" : "text-white/40 hover:text-white"}`}
              >
                PT
              </Link>
              <Link 
                to="/" 
                search={{ lang: 'en' }}
                className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${isEn ? "bg-primary text-black" : "text-white/40 hover:text-white"}`}
              >
                EN
              </Link>
            </div>
            <Link to="/login" className="text-sm font-medium text-white/60 hover:text-white transition-colors">
              {isEn ? "Login" : "Entrar"}
            </Link>
            <Button asChild className="rounded-full bg-primary text-black hover:bg-primary/90 px-6 font-bold h-10">
              <Link to={isEn ? "/Company-registration" : "/cadastro-empresa"} search={{ lang: isEn ? 'en' : 'pt' }}>
                {isEn ? "Start now" : "Começar agora"}
              </Link>
            </Button>
          </div>

          <button className="md:hidden text-white" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden absolute top-full left-0 right-0 bg-background border-b border-white/5 p-6 space-y-4"
          >
            {navLinks.map((link) => (
              <a 
                key={link.name} 
                href={link.href} 
                className="block text-lg text-white/70 hover:text-white"
                onClick={() => setIsMenuOpen(false)}
              >
                {link.name}
              </a>
            ))}
            <div className="pt-4 flex flex-col gap-4 border-t border-white/5">
              <div className="flex bg-white/5 rounded-lg p-1 border border-white/10 w-fit">
                <Link 
                  to="/" 
                  search={{ lang: 'pt' }}
                  className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${!isEn ? "bg-primary text-black" : "text-white/40"}`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Português
                </Link>
                <Link 
                  to="/" 
                  search={{ lang: 'en' }}
                  className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${isEn ? "bg-primary text-black" : "text-white/40"}`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  English
                </Link>
              </div>
              <Link to="/login" className="text-white/70 py-2" onClick={() => setIsMenuOpen(false)}>{isEn ? "Login" : "Entrar"}</Link>
              <Button asChild className="w-full bg-primary text-black font-bold h-12" onClick={() => setIsMenuOpen(false)}>
                <Link to="/login">{isEn ? "Create account" : "Criar conta"}</Link>
              </Button>
            </div>
          </motion.div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative h-screen flex items-center pt-32 md:pt-40 overflow-hidden">
        {/* Hero Video Background */}
        <div className="absolute inset-0 z-0">
          <video autoPlay muted loop playsInline className="h-full w-full object-cover">
            <source src={bgVideoAsset.url} type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-black/70" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
        </div>

        <div className="container mx-auto px-6 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-4xl"
          >
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tighter leading-[0.9] mb-8">
              <span className="sr-only">DashCompass</span>
              <span className="text-white block">{isEn ? "Every direction" : "Toda direção"}</span>
              <span className="text-primary italic block mt-4">{isEn ? "starts with data." : "começa com dados."}</span>
            </h1>
            <p className="sr-only">
              {isEn 
                ? "DashCompass is a professional marketing analytics platform. Our purpose is to unify data from Google Ads, Google Search Console, Meta and LinkedIn into a single intelligent dashboard, allowing companies and agencies to analyze performance and optimize investments with the help of AI."
                : "O DashCompass é uma plataforma profissional de marketing analytics. Nossa finalidade é unificar dados de Google Ads, Google Search Console, Meta e LinkedIn em um único dashboard inteligente, permitindo que empresas e agências analisem performance e otimizem investimentos com o auxílio de IA."}
            </p>
            <p className="text-xl md:text-2xl text-white/60 max-w-2xl leading-relaxed mb-10">
              {isEn 
                ? <><strong>DashCompass</strong> brings together data from the leading marketing platforms in one place. Your team tracks metrics, analyzes results, and asks the AI questions using the context of their own business.</>
                : <>O <strong>DashCompass</strong> reúne os dados das principais plataformas de marketing em um só lugar. Sua equipe acompanha métricas, analisa resultados e faz perguntas à IA usando o contexto do próprio negócio.</>}
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Button asChild size="lg" className="h-14 px-8 rounded-full bg-primary text-black font-bold text-lg hover:bg-primary/90 transition-all hover:scale-105">
                <Link to="/cadastro-empresa">{isEn ? "Start now" : "Começar agora"} <ArrowRight className="ml-2 h-5 w-5" /></Link>
              </Button>
              <Button variant="ghost" size="lg" className="h-14 px-8 rounded-full text-white font-semibold hover:bg-white/5 border border-white/10">
                {isEn ? "See demo" : "Ver demonstração"} <Play className="ml-2 h-4 w-4 fill-white" />
              </Button>
            </div>

            <div className="mt-16 flex flex-wrap items-center gap-x-8 gap-y-4 text-white/30 text-xs font-medium tracking-wider uppercase">
              <span>Meta Ads</span>
              <span>•</span>
              <span>Google Ads</span>
              <span>•</span>
              <span>Analytics</span>
              <span>•</span>
              <span>Search Console</span>
              <span>•</span>
              <span>LinkedIn</span>
              <span>•</span>
              <span>TikTok</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-24 border-t border-white/5">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-20 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-8">{isEn ? "Data already exists." : "Os dados já existem."} <br/><span className="text-white/40">{isEn ? "The problem is finding them." : "O problema é encontrá-los."}</span></h2>
              <div className="space-y-6">
                {(isEn ? [
                  "Data scattered across dozens of platforms.",
                  "Confusing dashboards and obsolete spreadsheets.",
                  "Wasting time searching for answers.",
                  "Decisions based on intuition, not facts."
                ] : [
                  "Dados espalhados em dezenas de plataformas.",
                  "Dashboards confusos e planilhas obsoletas.",
                  "Perda de tempo procurando por respostas.",
                  "Decisões baseadas em intuição, não em fatos."
                ]).map((text, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <CheckCircle2 className="h-6 w-6 text-primary shrink-0 mt-0.5" />
                    <p className="text-lg text-white/70">{text}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative aspect-square md:aspect-video bg-white/5 rounded-2xl border border-white/10 overflow-hidden group">
               <div className="absolute inset-0 bg-dot-grid opacity-20" />
               <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center p-8 space-y-4">
                    <img 
                      src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=2426&ixlib=rb-4.0.3" 
                      alt="Data analytics visualization" 
                      className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-overlay group-hover:scale-110 transition-transform duration-700"
                    />
                    <div className="relative z-10">
                      <div className="h-1.5 w-32 bg-primary/20 rounded-full overflow-hidden mx-auto mb-4">
                        <div className="h-full bg-primary animate-shimmer" style={{ width: '60%' }} />
                      </div>
                      <p className="text-white/40 font-mono text-sm tracking-widest uppercase">{isEn ? "Intelligent Data Analysis" : "Análise Inteligente de Dados"}</p>
                    </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Connection Section */}
      <section id="features" className="py-24 bg-card/30">
        <div className="container mx-auto px-6 text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">{isEn ? "Everything connected." : "Tudo conectado."}</h2>
          <p className="text-xl text-white/50 max-w-2xl mx-auto">{isEn ? "DashCompass organizes campaigns, traffic, and results in a single unified view." : "O DashCompass organiza campanhas, tráfego e resultados em uma única visão unificada."}</p>
        </div>
        
        <div className="container mx-auto px-6 grid md:grid-cols-3 gap-8">
          {[
            { title: isEn ? "Always updated" : "Sempre atualizado", desc: isEn ? "Real-time data. No refreshing or waiting for manual exports." : "Dados em tempo real. Sem apertar F5 ou esperar por exportações manuais." },
            { title: isEn ? "Always available" : "Sempre disponível", desc: isEn ? "Access from anywhere. Share with your team or clients instantly." : "Acesse de qualquer lugar. Compartilhe com sua equipe ou clientes instantaneamente." },
            { title: isEn ? "Less noise" : "Menos ruído", desc: isEn ? "We filter what doesn't matter. See only the KPIs that move the needle." : "Filtramos o que não importa. Veja apenas os KPIs que movem o ponteiro do negócio." }
          ].map((feature, i) => (
            <div key={i} className="p-8 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-primary/20 transition-all hover:-translate-y-1">
              <h3 className="text-2xl font-bold mb-4">{feature.title}</h3>
              <p className="text-white/50 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* AI Section */}
      <section id="ai" className="py-32 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="container mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
          <div className="order-2 md:order-1 relative">
            <div className="space-y-4 font-mono text-sm">
              {(isEn ? [
                "Which campaign brought more sales?",
                "Why did my CPA increase yesterday?",
                "Which influencer generated more conversions?",
                "Compare this month with the previous one.",
                "Where should I invest more budget?"
              ] : [
                "Qual campanha trouxe mais vendas?",
                "Por que meu CPA aumentou ontem?",
                "Qual influenciador gerou mais conversões?",
                "Compare este mês com o anterior.",
                "Onde devo investir mais orçamento?"
              ]).map((q, i) => (
                <div key={i} className="p-4 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-between group cursor-default">
                  <span>{q}</span>
                  <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
            </div>
          </div>
          <div className="order-1 md:order-2">
            <h2 className="text-4xl md:text-5xl font-bold mb-8 leading-tight">{isEn ? "Your AI, now with" : "Sua IA, agora com"} <span className="text-primary italic">{isEn ? "real context." : "contexto real."}</span></h2>
            <p className="text-xl text-white/60 leading-relaxed mb-8">
              {isEn ? "Connect DashCompass to ChatGPT or Claude. Your AI starts understanding your metrics, campaigns, and sales. Stop getting generic answers and start having a 24h data analyst." : "Conecte o DashCompass ao ChatGPT ou Claude. Sua IA passa a entender suas métricas, campanhas e vendas. Pare de receber respostas genéricas e comece a ter um analista de dados 24h."}
            </p>
            <div className="flex items-center gap-6">
              <div className="flex flex-col">
                <span className="text-3xl font-bold">10x</span>
                <span className="text-xs text-white/30 uppercase tracking-widest">{isEn ? "Faster" : "Mais rapidez"}</span>
              </div>
              <div className="h-10 w-px bg-white/10" />
              <div className="flex flex-col">
                <span className="text-3xl font-bold">100%</span>
                <span className="text-xs text-white/30 uppercase tracking-widest">{isEn ? "Data-based" : "Baseado em dados"}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="py-24 bg-card/30">
        <div className="container mx-auto px-6 text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">{isEn ? "Choose your plan." : "Escolha seu plano."}</h2>
          <p className="text-xl text-white/50">{isEn ? "Maximize your marketing ROI with DashCompass intelligence." : "Maximize o ROI do seu marketing com a inteligência do DashCompass."}</p>
        </div>

        <div className="container mx-auto px-6 grid lg:grid-cols-4 gap-6">
          {plans.map((plan) => (
            <div 
              key={plan.name} 
              className={`relative p-8 rounded-3xl border transition-all flex flex-col ${
                plan.highlight 
                  ? "bg-primary/[0.03] border-primary/40 shadow-[0_20px_40px_rgba(61,252,3,0.05)] ring-1 ring-primary/20" 
                  : "bg-white/[0.03] border-white/10"
              }`}
            >
              {plan.highlight && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-black text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">
                {isEn ? "Most Popular" : "Mais Escolhido"}
              </div>
              )}
              <div className="mb-8">
                <h3 className="text-lg font-bold text-white/60 mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold tracking-tight">{plan.price}</span>
                  {!plan.price.includes("On request") && !plan.price.includes("Sob consulta") && <span className="text-white/40 text-sm">/{isEn ? "month" : "mês"}</span>}
                </div>
                <p className="text-sm text-white/40 mt-4">{plan.description}</p>
              </div>

              <div className="space-y-4 mb-8 flex-grow">
                {plan.features.map((feature, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm text-white/70">
                    <CheckCircle2 className={`h-4 w-4 shrink-0 ${plan.highlight ? "text-primary" : "text-white/20"}`} />
                    {feature}
                  </div>
                ))}
              </div>

              <Button 
                asChild
                className={`w-full h-12 rounded-full font-bold transition-all ${
                  plan.highlight 
                    ? "bg-primary text-black hover:bg-primary/90 scale-105" 
                    : "bg-white/5 text-white hover:bg-white/10 border border-white/10"
                }`}
              >
                <Link to="/cadastro-empresa">{plan.buttonText}</Link>
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 border-t border-white/5">
        <div className="container mx-auto px-6 text-center max-w-4xl">
          <h2 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 italic">
            {isEn ? "Your data deserves" : "Seus dados merecem"} <br />
            <span className="text-primary italic">{isEn ? "more than dashboards." : "mais do que dashboards."}</span>
          </h2>
          <p className="text-xl text-white/50 mb-12">
            {isEn ? "They deserve intelligence and direction. Start transforming metrics into real results today." : "Eles merecem inteligência e direção. Comece hoje a transformar métricas em resultados reais."}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Button asChild size="lg" className="h-16 px-10 rounded-full bg-primary text-black font-bold text-xl hover:bg-primary/90 transition-all hover:scale-105">
              <Link to="/cadastro-empresa">{isEn ? "Start now" : "Começar agora"}</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-8">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <Logo iconClassName="h-6 w-6" textClassName="text-lg" />
            </div>
            <div className="flex items-center gap-8 text-sm text-white/40">
              <Link to="/terms" className="hover:text-primary transition-colors">{isEn ? "Terms" : "Termos"}</Link>
              <Link to="/privacy" className="hover:text-primary transition-colors">{isEn ? "Privacy" : "Privacidade"}</Link>
              <Link to="/login" className="hover:text-primary transition-colors">{isEn ? "Access" : "Acesso"}</Link>
            </div>
          </div>
          <div className="pt-8 border-t border-white/5 text-center">
            <p className="text-xs text-white/20 mb-2">© 2026 DashCompass. {isEn ? "Designed for clarity." : "Projetado para clareza."}</p>
            <div className="space-y-1">
              <p className="text-[10px] text-white/10 uppercase tracking-widest font-bold">The Fcking Company LLC</p>
              <p className="text-[10px] text-white/10">30 N Gould st ste N sheridan wy 82801</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

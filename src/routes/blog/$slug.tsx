import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, User, Clock, Share2 } from "lucide-react";
import { posts } from "./index";

export const Route = createFileRoute("/blog/$slug")({
  head: (context) => {
    const post = posts.find(p => p.slug === context.params.slug);
    return {
      meta: [
        { title: `${post?.title || 'Post'} — Blog DashCompass` },
        { name: "description", content: post?.excerpt || '' },
      ],
    };
  },
  component: BlogPost,
});

function BlogPost() {
  const { slug } = useParams({ from: "/blog/$slug" });
  const post = posts.find(p => p.slug === slug);

  if (!post) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Post não encontrado</h1>
          <Link to="/blog" className="text-primary hover:underline">Voltar para o blog</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <nav className="border-b border-white/5 bg-background/80 backdrop-blur-md sticky top-0 z-50 py-4">
        <div className="container mx-auto px-6 flex items-center justify-between">
          <Link to="/" search={{ lang: 'pt' }}>
            <Logo iconClassName="h-8 w-8" textClassName="text-xl" />
          </Link>
          <Link to="/blog" className="text-sm font-medium text-white/60 hover:text-white flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Todos os artigos
          </Link>
        </div>
      </nav>

      <article className="py-20">
        <header className="container mx-auto px-6 max-w-4xl text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="bg-primary/10 text-primary text-xs font-bold px-4 py-1.5 rounded-full w-fit mx-auto mb-6">
              {post.category}
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tighter mb-8 leading-[1.1]">
              {post.title}
            </h1>
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-white/40">
              <span className="flex items-center gap-2"><User className="h-4 w-4" /> {post.author}</span>
              <span className="flex items-center gap-2"><Calendar className="h-4 w-4" /> {post.date}</span>
              <span className="flex items-center gap-2"><Clock className="h-4 w-4" /> {post.readTime}</span>
            </div>
          </motion.div>
        </header>

        <div className="container mx-auto px-6 max-w-5xl mb-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="aspect-[21/9] rounded-3xl overflow-hidden border border-white/10"
          >
            <img 
              src={post.image} 
              alt={post.title}
              className="w-full h-full object-cover"
            />
          </motion.div>
        </div>

        <div className="container mx-auto px-6 max-w-3xl">
          <div className="prose prose-invert prose-primary max-w-none">
            <p className="text-xl text-white/70 leading-relaxed mb-8 font-medium italic">
              {post.excerpt}
            </p>
            
            <div className="space-y-6 text-white/60 leading-relaxed text-lg">
              {post.slug === "como-integrar-google-ads-e-meta-ads" ? (
                <>
                  <p>
                    No cenário atual do marketing digital, a fragmentação de dados é o maior inimigo do ROAS (Retorno sobre Investimento em Publicidade). Gerenciar Google Ads e Meta Ads em silos separados não apenas consome tempo, mas esconde insights críticos sobre a jornada multicanal do consumidor.
                  </p>

                  <h2 className="text-3xl font-bold text-white mt-12 mb-6">Por que a integração é vital para SEO e GEO (Generative Engine Optimization)?</h2>
                  <p>
                    Com a ascensão do <strong>AEO (Answer Engine Optimization)</strong> e das buscas generativas (SGE), os motores de busca agora priorizam entidades e contextos. Ter um dashboard unificado permite que você alimente sua estratégia de conteúdo com dados reais de intenção (Google) e interesse (Meta), criando uma sinergia que algoritmos de IA adoram recomendar.
                  </p>

                  <h3 className="text-2xl font-bold text-white mt-8 mb-4">1. Visão Holística da Atribuição</h3>
                  <p>
                    Muitas conversões começam com um anúncio de descoberta no Instagram e terminam com uma busca direta no Google. Sem a integração, ambos os canais podem reivindicar o crédito (atribuição duplicada) ou você pode subestimar o impacto do topo de funil do Meta.
                  </p>

                  <h3 className="text-2xl font-bold text-white mt-8 mb-4">2. Otimização de Orçamento em Tempo Real</h3>
                  <p>
                    Um dashboard unificado no <strong>DashCompass</strong> permite identificar qual criativo está performando melhor cross-platform. Se o CPA no Google está subindo, mas o Meta está trazendo tráfego qualificado a baixo custo, a realocação deve ser imediata.
                  </p>

                  <div className="my-12 p-8 glass-strong rounded-2xl border-l-4 border-primary">
                    <p className="text-white italic text-xl">
                      "A integração de dados não é mais um diferencial competitivo, é o requisito básico para a sobrevivência de qualquer agência que busca escala em 2026."
                    </p>
                  </div>

                  <h3 className="text-2xl font-bold text-white mt-8 mb-4">3. Preparando para o Futuro: GEO e Pesquisa por IA</h3>
                  <p>
                    O GEO exige que sua marca seja uma autoridade consistente em todos os pontos de contato. Ao alinhar as métricas de Google e Meta, você garante que as narrativas de marca sejam coerentes, facilitando o trabalho de LLMs em identificar sua empresa como a solução ideal para os usuários.
                  </p>

                  <h2 className="text-3xl font-bold text-white mt-12 mb-6">Conclusão</h2>
                  <p>
                    Integrar Google e Meta Ads no DashCompass é o primeiro passo para sair do operacional e focar no estratégico. Utilize nossa inteligência artificial para detectar anomalias e oportunidades que passariam despercebidas em planilhas manuais.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    A Inteligência Artificial não é mais uma promessa distante; é o motor de combustão do marketing moderno. Com a chegada do <strong>GPT-5 Nano</strong> e a evolução das buscas generativas, as marcas que não se adaptarem ao <strong>GEO (Generative Engine Optimization)</strong> e ao <strong>AEO (Answer Engine Optimization)</strong> serão invisíveis para os consumidores em 2026.
                  </p>
                  
                  <h2 className="text-3xl font-bold text-white mt-12 mb-6">A Era da Automação Cognitiva e GEO</h2>
                  <p>
                    O SEO tradicional, focado apenas em palavras-chave e backlinks, está evoluindo para a otimização de intenção e contexto. No ecossistema de busca por IA, seu conteúdo precisa ser a "resposta definitiva". Isso significa estruturar dados para que LLMs (Large Language Models) identifiquem sua marca como uma autoridade incontestável.
                  </p>

                  <h3 className="text-2xl font-bold text-white mt-8 mb-4">Como o DashCompass Antecipa essa Mudança</h3>
                  <p>
                    Não basta gerar conteúdo; é preciso medir o impacto. O DashCompass utiliza modelos preditivos para analisar como as mudanças nos algoritmos de IA afetam seu tráfego orgânico e pago, permitindo ajustes em tempo real que protegem sua soberania digital.
                  </p>

                  <div className="my-12 p-10 glass-strong rounded-3xl border border-primary/30 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      <Logo iconClassName="h-32 w-32" />
                    </div>
                    <h4 className="text-2xl font-bold text-primary mb-4 relative z-10">Pronto para o futuro do Marketing com IA?</h4>
                    <p className="text-white/80 mb-8 text-lg relative z-10">
                      Não fique para trás na revolução do GEO. Comece a gerenciar suas métricas com a inteligência que sua agência merece.
                    </p>
                    <Link to="/auth" className="inline-flex items-center justify-center px-8 py-4 bg-primary text-black font-bold rounded-full hover:scale-105 transition-transform relative z-10">
                      Experimentar DashCompass Grátis
                    </Link>
                  </div>

                  <h3 className="text-2xl font-bold text-white mt-8 mb-4">Sinergia entre Criatividade e Dados</h3>
                  <p>
                    A IA não substitui o estrategista; ela remove o peso do trabalho braçal. Ao automatizar a coleta e o cruzamento de dados de Google, Meta e Bing no <strong>DashCompass</strong>, sua equipe ganha tempo para o que realmente importa: a estratégia criativa que ressoa com humanos e máquinas.
                  </p>

                  <h2 className="text-3xl font-bold text-white mt-12 mb-6">Conclusão: O Próximo Passo</h2>
                  <p>
                    O futuro do marketing digital pertence àqueles que tratam dados como o ativo mais valioso da empresa. A integração total e a análise preditiva são os pilares do sucesso no novo paradigma da Web 3.0 e das buscas orientadas por IA.
                  </p>
                </>

              )}
            </div>
          </div>

          <div className="mt-20 pt-10 border-t border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                FG
              </div>
              <div>
                <p className="text-sm font-bold text-white">{post.author}</p>
                <p className="text-xs text-white/40">Growth & Data Analytics</p>
              </div>
            </div>
            <button className="flex items-center gap-2 text-white/60 hover:text-primary transition-colors text-sm font-medium">
              <Share2 className="h-4 w-4" /> Compartilhar
            </button>
          </div>
        </div>
      </article>

      <footer className="py-20 border-t border-white/5 mt-20">
        <div className="container mx-auto px-6 text-center">
          <Logo iconClassName="h-6 w-6 mx-auto mb-6" textClassName="text-lg" />
          <p className="text-white/40 text-sm">© 2026 DashCompass. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}

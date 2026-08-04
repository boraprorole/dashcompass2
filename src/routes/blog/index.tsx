import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, ChevronRight, Calendar, User, ArrowLeft } from "lucide-react";

export const posts = [
  {
    slug: "como-integrar-google-ads-e-meta-ads",
    title: "Como integrar Google Ads e Meta Ads em um único Dashboard",
    excerpt: "Descubra como a unificação de canais pode transformar sua análise de marketing e otimizar seu ROAS global.",
    date: "04 Ago 2026",
    author: "Felipe Gouveia",
    category: "Tutorial",
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=2426",
    readTime: "5 min"
  },
  {
    slug: "o-futuro-do-marketing-com-ia",
    title: "O Futuro do Marketing Digital com Inteligência Artificial",
    excerpt: "Como o GPT-5 e modelos preditivos estão mudando a forma como agências gerenciam campanhas de alta performance.",
    date: "02 Ago 2026",
    author: "Equipe DashCompass",
    category: "Tendências",
    image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=2426",
    readTime: "7 min"
  }
];

export const Route = createFileRoute("/blog/")({
  head: () => ({
    meta: [
      { title: "Blog DashCompass — Insights sobre Dados e Marketing" },
      { name: "description", content: "Artigos, tutoriais e tendências sobre integração de dados, dashboards de marketing e inteligência artificial." },
    ],
  }),
  component: BlogIndex,
});

function BlogIndex() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* Simple Header */}
      <nav className="border-b border-white/5 bg-background/80 backdrop-blur-md sticky top-0 z-50 py-4">
        <div className="container mx-auto px-6 flex items-center justify-between">
          <Link to="/" search={{ lang: 'pt' }}>
            <Logo iconClassName="h-8 w-8" textClassName="text-xl" />
          </Link>
          <Link to="/" search={{ lang: 'pt' }} className="text-sm font-medium text-white/60 hover:text-white flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Voltar para Home
          </Link>
        </div>
      </nav>

      <main className="container mx-auto px-6 py-20">
        <div className="max-w-4xl mx-auto mb-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-5xl md:text-6xl font-bold tracking-tighter mb-6">
              Blog <span className="text-primary italic">DashCompass</span>
            </h1>
            <p className="text-xl text-white/60 leading-relaxed">
              Explorando o futuro do marketing analytics, integração de dados e inteligência artificial.
            </p>
          </motion.div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {posts.map((post, index) => (
            <motion.div
              key={post.slug}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="group glass-strong rounded-2xl overflow-hidden border border-white/5 hover:border-primary/30 transition-all"
            >
              <Link to="/blog/$slug" params={{ slug: post.slug }}>
                <div className="aspect-video relative overflow-hidden">
                  <img 
                    src={post.image} 
                    alt={post.title}
                    className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-4 left-4 bg-primary text-black text-xs font-bold px-3 py-1 rounded-full">
                    {post.category}
                  </div>
                </div>
                <div className="p-8">
                  <div className="flex items-center gap-4 text-xs text-white/40 mb-4">
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {post.date}</span>
                    <span className="flex items-center gap-1"><User className="h-3 w-3" /> {post.author}</span>
                  </div>
                  <h2 className="text-2xl font-bold mb-4 group-hover:text-primary transition-colors">
                    {post.title}
                  </h2>
                  <p className="text-white/60 mb-6 line-clamp-2">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center text-primary font-bold text-sm">
                    Ler artigo <ChevronRight className="ml-1 h-4 w-4" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </main>

      <footer className="py-20 border-t border-white/5 mt-20">
        <div className="container mx-auto px-6 text-center">
          <Logo iconClassName="h-6 w-6 mx-auto mb-6" textClassName="text-lg" />
          <p className="text-white/40 text-sm">© 2026 DashCompass. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}

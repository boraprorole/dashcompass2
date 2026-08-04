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
              <p>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
              </p>
              
              <h2 className="text-2xl font-bold text-white mt-12 mb-6">A importância da unificação</h2>
              
              <p>
                Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
              </p>

              <div className="my-12 p-8 glass-strong rounded-2xl border-l-4 border-primary">
                <p className="text-white italic text-xl">
                  "A inteligência artificial não substitui o estrategista, ela o empodera com dados que antes eram impossíveis de processar em tempo real."
                </p>
              </div>

              <p>
                Curabitur pretium tincidunt lacus. Nulla gravida orci a odio. Nullam varius, turpis et commodo pharetra, est eros bibendum elit, nec luctus magna felis sollicitudin mauris. Integer in mauris eu nibh euismod gravida.
              </p>
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

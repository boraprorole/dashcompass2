import { createFileRoute, Navigate, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { searchNews } from "@/lib/news.functions";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Search, ExternalLink, Newspaper } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/pr")({
  beforeLoad: async () => {
    const { data, error } = await supabase.from("app_features").select("enabled").eq("key", "/pr").maybeSingle();
    if (error || (data && !data.enabled)) {
      throw redirect({ to: "/reports" });
    }
  },
  component: PRPage,
});

function PRPage() {
  const { isAdmin, isTeam, loading } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [query, setQuery] = useState("");
  const searchNewsFn = useServerFn(searchNews);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["news", "google-rss-v2", query],
    queryFn: () => searchNewsFn({ data: { query } }),
    enabled: !!query,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const nextQuery = searchTerm.trim();
    if (!nextQuery) return;
    if (nextQuery === query) refetch();
    else setQuery(nextQuery);
  };

  if (loading) return null;
  if (!isAdmin && !isTeam) return <Navigate to="/reports" />;


  return (
    <div className="space-y-8">
      <header className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Newspaper className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">PR & Clipping</h1>
          <p className="text-sm text-muted-foreground">
            Busque notícias e menções em tempo real via NewsAPI e Google News.
          </p>
        </div>
      </header>

      <div className="glass-strong p-6 rounded-3xl">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Digite o nome de uma empresa, marca ou palavra-chave..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}
          </Button>
        </form>
      </div>

      {isLoading && (
        <div className="flex flex-col items-center justify-center p-20 space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Vasculhando a web por notícias...</p>
        </div>
      )}

      {error && (
        <div className="p-8 text-center glass rounded-2xl border-destructive/20 text-destructive">
          <p className="font-medium">Erro ao carregar notícias</p>
          <p className="text-xs mt-1 opacity-80">{(error as Error).message || "Verifique se a NEWS_API_KEY está configurada no Admin."}</p>
        </div>
      )}

      {!isLoading && !query && (
        <div className="p-20 text-center glass rounded-2xl">
          <Newspaper className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
          <p className="text-muted-foreground text-lg">Comece buscando por uma marca para ver as últimas notícias.</p>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {data?.articles?.map((article: any, i: number) => (
          <Card key={i} className="glass overflow-hidden flex flex-col hover:shadow-lg transition-all border-none">
            {article.urlToImage && (
              <div className="aspect-video w-full overflow-hidden">
                <img 
                  src={article.urlToImage} 
                  alt={article.title} 
                  className="h-full w-full object-cover transition-transform hover:scale-105" 
                />
              </div>
            )}
            <CardHeader className="p-4 space-y-1">
              <div className="flex justify-between items-start gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
                  {article.source.name}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(article.publishedAt).toLocaleDateString("pt-BR")}
                </span>
              </div>
              <CardTitle className="text-base line-clamp-2 leading-tight">
                {article.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 flex-1 flex flex-col justify-between gap-4">
              <CardDescription className="line-clamp-3 text-xs leading-relaxed">
                {article.description}
              </CardDescription>
              <Button asChild variant="secondary" size="sm" className="w-full mt-2">
                <a href={article.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                  Ler notícia <ExternalLink className="h-3 w-3" />
                </a>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {data?.articles?.length === 0 && (
        <div className="p-20 text-center glass rounded-2xl">
          <p className="text-muted-foreground">Nenhuma notícia encontrada para "{query}".</p>
        </div>
      )}
    </div>
  );
}

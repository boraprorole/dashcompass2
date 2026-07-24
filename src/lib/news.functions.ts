import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const searchNews = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z.object({
      query: z.string(),
      language: z.string().optional(),
      sortBy: z.enum(["relevancy", "popularity", "publishedAt"]).optional().default("publishedAt"),
    }).parse(data)
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let apiKey: string | undefined = process.env.NEWS_API_KEY;

    if (!apiKey) {
      const { data: setting } = await supabaseAdmin
        .from("app_settings")
        .select("value")
        .eq("key", "news_api_key")
        .maybeSingle();
      apiKey = setting?.value ?? undefined;
    }

    const userAgent = "DashCompassDashboard/1.0 (+https://dashcompass.lovable.app)";
    const headers: Record<string, string> = { "User-Agent": userAgent };
    if (apiKey) headers["X-Api-Key"] = apiKey;

    // Aspas garantem match de frase exata (ex: nome próprio)
    const q = /\s/.test(data.query.trim()) && !data.query.includes('"')
      ? `"${data.query.trim()}"`
      : data.query.trim();

    // NewsAPI free/developer permite até ~30 dias. Puxamos o máximo permitido.
    const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    async function fetchNews(opts: { q: string; lang?: string; searchIn?: string }) {
      const url = new URL("https://newsapi.org/v2/everything");
      url.searchParams.set("q", opts.q);
      url.searchParams.set("sortBy", data.sortBy);
      url.searchParams.set("pageSize", "50");
      url.searchParams.set("from", from);
      if (opts.lang) url.searchParams.set("language", opts.lang);
      if (opts.searchIn) url.searchParams.set("searchIn", opts.searchIn);
      const res = await fetch(url.toString(), { headers });
      const json = await res.json();
      if (json.status === "error") throw new Error(json.message || "Erro ao buscar notícias.");
      return json;
    }

    const seen = new Set<string>();
    let merged: any[] = [];
    let newsApiError: string | null = null;

    if (!apiKey) {
      newsApiError = "NEWS_API_KEY não configurada. Usando Google News RSS como fonte complementar.";
    } else if (data.language) {
      try {
        const r = await fetchNews({ q, lang: data.language });
        merged = (r.articles ?? []).filter((a: any) => a?.url);
        for (const a of merged) seen.add(a.url);
      } catch (e: any) {
        newsApiError = e?.message ?? String(e);
      }
    } else {
      try {
        const [pt, all] = await Promise.all([
          fetchNews({ q, lang: "pt" }),
          fetchNews({ q }),
        ]);
        merged = [...(pt.articles ?? []), ...(all.articles ?? [])].filter((a: any) => {
          if (!a?.url || seen.has(a.url)) return false;
          seen.add(a.url);
          return true;
        });

        if (merged.length === 0) {
          const loose = await fetchNews({ q: data.query.trim(), searchIn: "title,description" });
          for (const a of loose.articles ?? []) {
            if (a?.url && !seen.has(a.url)) { seen.add(a.url); merged.push(a); }
          }
        }
      } catch (e: any) {
        newsApiError = e?.message ?? String(e);
      }
    }

    // Google/Bing News RSS (sem API key) — cobre portais pequenos que a NewsAPI ignora
    function decodeXml(value: string) {
      return value
        .replace(/<!\[CDATA\[|\]\]>/g, "")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;|&apos;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
        .trim();
    }

    function stripAccents(value: string) {
      return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }

    function normalizeArticleUrl(value: string) {
      try {
        const url = new URL(value);
        if (url.hostname.includes("bing.com") && url.pathname.includes("/news/apiclick.aspx")) {
          return url.searchParams.get("url") || value;
        }
        return value;
      } catch {
        return value;
      }
    }

    function googleQueryVariants(query: string) {
      const clean = query.trim().replace(/\s+/g, " ");
      const variants = new Set<string>();
      variants.add(clean);
      if (/\s/.test(clean)) variants.add(`"${clean.replace(/"/g, "")}"`);
      const noAccents = stripAccents(clean);
      if (noAccents !== clean) {
        variants.add(noAccents);
        if (/\s/.test(noAccents)) variants.add(`"${noAccents.replace(/"/g, "")}"`);
      }
      // Portais regionais nem sempre ranqueiam na busca exata; esta variação amplia sem perder todos os termos principais.
      const words = clean.split(" ").filter((word) => word.length > 2);
      if (words.length >= 3) variants.add(words.join(" "));
      return [...variants].slice(0, 6);
    }

    function parseRssArticles(xml: string, fallbackSource: string) {
      const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 50);
      const pick = (block: string, tag: string) => {
        const m = block.match(new RegExp(`<${tag}(?:[^>]*)>([\\s\\S]*?)</${tag}>`));
        if (!m) return "";
        return decodeXml(m[1]);
      };

      return items.map((m) => {
        const b = m[1];
        const desc = pick(b, "description");
        const rawUrl = pick(b, "link");
        const sourceMatch = b.match(/<(?:source|News:Source)[^>]*>([\s\S]*?)<\/(?:source|News:Source)>/i);
        return {
          title: pick(b, "title"),
          url: normalizeArticleUrl(rawUrl),
          publishedAt: pick(b, "pubDate"),
          description: desc.replace(/<[^>]+>/g, "").slice(0, 300),
          source: { name: sourceMatch ? decodeXml(sourceMatch[1]) : fallbackSource },
          urlToImage: null,
        };
      }).filter((a) => a.url);
    }

    async function fetchGoogleNews(query: string) {
      try {
        const gUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;
        const res = await fetch(gUrl, { headers: { "User-Agent": userAgent } });
        if (!res.ok) return [];
        const xml = await res.text();
        return parseRssArticles(xml, "Google News");
      } catch {
        return [];
      }
    }

    async function fetchBingNews(query: string) {
      try {
        const bUrl = `https://www.bing.com/news/search?q=${encodeURIComponent(query)}&format=rss&setlang=pt-BR&cc=BR`;
        const res = await fetch(bUrl, { headers: { "User-Agent": userAgent } });
        if (!res.ok) return [];
        const xml = await res.text();
        return parseRssArticles(xml, "Bing News");
      } catch {
        return [];
      }
    }

    const queryVariants = googleQueryVariants(data.query);
    const [googleResults, bingResults] = await Promise.all([
      Promise.all(queryVariants.map((query) => fetchGoogleNews(query))),
      Promise.all(queryVariants.map((query) => fetchBingNews(query))),
    ]);
    for (const rssResults of [...googleResults, ...bingResults]) {
      for (const a of rssResults) {
        if (a.url && !seen.has(a.url)) {
          seen.add(a.url);
          merged.push(a);
        }
      }
    }

    const sorted = merged.sort((a: any, b: any) => {
      const da = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const db = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return db - da;
    });

    return {
      status: "ok",
      totalResults: sorted.length,
      articles: sorted,
      newsApiError,
      note: "NewsAPI (últimos 30 dias) + Google News RSS + Bing News RSS.",
    };
  });

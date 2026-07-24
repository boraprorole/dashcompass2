import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { searchNews } from "../../news.functions";

export default defineTool({
  name: "search_news",
  title: "Search News",
  description: "Busca notícias e menções na web via NewsAPI. Útil para PR e Clipping.",
  inputSchema: {
    query: z.string().describe("Termo de busca (empresa, marca, etc)"),
  },
  handler: async ({ query }) => {
    // Note: searchNews is a server function. We use it directly.
    const result = await searchNews({ data: { query: String(query) } });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  },
});

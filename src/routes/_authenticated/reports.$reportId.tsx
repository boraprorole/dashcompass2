import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { parseEmbed } from "@/lib/parse-embed";
import { ReportMetricsPanel } from "@/components/windsor/ReportMetricsPanel";

export const Route = createFileRoute("/_authenticated/reports/$reportId")({
  head: () => ({
    meta: [{ title: "Relatório" }],
  }),
  component: ReportDetailPage,
});

function ReportDetailPage() {
  const { reportId } = Route.useParams();

  const { data, isLoading, error } = useQuery({
    queryKey: ["report-detail", reportId],
    queryFn: async () => {
      const [reportRes, sectionsRes] = await Promise.all([
        supabase
          .from("reports")
          .select("id, embed_code")
          .eq("id", reportId)
          .maybeSingle(),
        supabase
          .from("report_sections")
          .select("id, title, embed_code, position")
          .eq("report_id", reportId)
          .order("position", { ascending: true }),
      ]);
      if (reportRes.error) throw reportRes.error;
      if (sectionsRes.error) throw sectionsRes.error;
      return { report: reportRes.data, sections: sectionsRes.data ?? [] };
    },
  });

  if (isLoading) {
    return (
      <div className="glass-strong mx-auto flex max-w-6xl items-center justify-center rounded-3xl p-12 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando...
      </div>
    );
  }
  if (error || !data?.report) {
    return (
      <div className="glass-strong mx-auto max-w-6xl rounded-3xl p-8 text-destructive">
        Relatório não encontrado ou sem acesso.
      </div>
    );
  }

  const { report, sections } = data;
  // Build tabs: prefer sections; fall back to legacy single embed_code on the report.
  const tabs =
    sections.length > 0
      ? sections.map((s) => ({ id: s.id, title: s.title, embed_code: s.embed_code }))
      : report.embed_code
        ? [{ id: "default", title: "Relatório", embed_code: report.embed_code }]
        : [];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-3 md:gap-4">
      <ReportMetricsPanel reportId={reportId} />
      {tabs.length > 0 && (
      <div className="flex h-[calc(100dvh-11.5rem)] flex-col gap-3 md:h-[calc(100dvh-5rem)] md:gap-4">
      {tabs.length === 1 ? (
        <EmbedFrame title={tabs[0].title} embedCode={tabs[0].embed_code} />
      ) : (
        <Tabs defaultValue={tabs[0].id} className="flex min-h-0 flex-1 flex-col gap-3">
          <TabsList className="glass flex h-auto flex-wrap justify-start">
            {tabs.map((t) => (
              <TabsTrigger key={t.id} value={t.id}>
                {t.title}
              </TabsTrigger>
            ))}
          </TabsList>
          {tabs.map((t) => (
            <TabsContent
              key={t.id}
              value={t.id}
              className="mt-0 min-h-0 flex-1 data-[state=inactive]:hidden"
            >
              <EmbedFrame title={t.title} embedCode={t.embed_code} />
            </TabsContent>
          ))}
        </Tabs>
      )}
      </div>
      )}
    </div>
  );
}

function EmbedFrame({ title, embedCode }: { title: string; embedCode: string | null }) {
  const embed = parseEmbed(embedCode);

  if (!embed) {
    return (
      <div className="glass-strong flex flex-1 items-center justify-center rounded-3xl p-10 text-center text-sm text-muted-foreground">
        Conteúdo indisponível para esta seção.
      </div>
    );
  }

  return (
    <div className="glass-strong relative h-full w-full min-h-0 flex-1 overflow-hidden rounded-3xl">
      <iframe
        src={embed.src}
        title={title}
        className="absolute inset-0 block h-full w-full border-0"
        allowFullScreen
        sandbox="allow-storage-access-by-user-activation allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      />
    </div>
  );
}


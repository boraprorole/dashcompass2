import { useState, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listGoogleAdsDatasets,
  uploadGoogleAdsCsv,
  deleteGoogleAdsDataset,
} from "@/lib/googleads-csv.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Trash2, Upload, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

export function GoogleAdsCsvManager({ reportId }: { reportId: string }) {
  const qc = useQueryClient();
  const listFn = useServerFn(listGoogleAdsDatasets);
  const uploadFn = useServerFn(uploadGoogleAdsCsv);
  const delFn = useServerFn(deleteGoogleAdsDataset);

  const [label, setLabel] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const key = ["gads-csv-datasets", reportId];
  const { data, isLoading } = useQuery({
    queryKey: key,
    queryFn: () => listFn({ data: { reportId } }),
  });

  const upload = useMutation({
    mutationFn: async () => {
      const file = fileRef.current?.files?.[0];
      if (!file) throw new Error("Selecione um arquivo CSV");
      if (!label.trim()) throw new Error("Defina um rótulo para o período (ex: Jun/2024 – Jul/2025)");
      const csvText = await file.text();
      return uploadFn({
        data: {
          reportId,
          periodLabel: label.trim(),
          csvText,
          filename: file.name,
          periodStart: start || null,
          periodEnd: end || null,
        },
      });
    },
    onSuccess: (r) => {
      toast.success(`Importado: ${r.rows} campanhas`);
      qc.invalidateQueries({ queryKey: key });
      qc.invalidateQueries({ queryKey: ["gads-csv-report", reportId] });
      setLabel(""); setStart(""); setEnd("");
      if (fileRef.current) fileRef.current.value = "";
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (datasetId: string) => delFn({ data: { datasetId } }),
    onSuccess: () => {
      toast.success("Removido");
      qc.invalidateQueries({ queryKey: key });
      qc.invalidateQueries({ queryKey: ["gads-csv-report", reportId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border/60 bg-background/60 p-3 space-y-3">
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="sm:col-span-3">
            <Label className="text-xs">Rótulo do período</Label>
            <Input
              placeholder="Ex: Jun/2024 – Jul/2025"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">Início (opcional)</Label>
            <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Fim (opcional)</Label>
            <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Arquivo CSV</Label>
            <Input ref={fileRef} type="file" accept=".csv,text/csv" />
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => upload.mutate()}
          disabled={upload.isPending}
          className="gap-2"
        >
          {upload.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Enviar CSV
        </Button>
        <p className="text-[11px] text-muted-foreground">
          Exporte do Google Ads em CSV (formato brasileiro com “;” e vírgula decimal também funciona).
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
        </div>
      ) : (data ?? []).length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhum CSV importado ainda.</p>
      ) : (
        <ul className="space-y-2">
          {(data ?? []).map((d) => (
            <li
              key={d.id}
              className="flex items-center justify-between rounded-lg border border-border/60 bg-background/40 px-3 py-2 text-sm"
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileSpreadsheet className="h-4 w-4 text-primary shrink-0" />
                <div className="min-w-0">
                  <div className="truncate font-medium">{d.period_label}</div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    {d.period_start ?? "?"} → {d.period_end ?? "?"} · {d.source_filename ?? "arquivo"}
                  </div>
                </div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  if (confirm("Remover este dataset?")) del.mutate(d.id);
                }}
                disabled={del.isPending}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

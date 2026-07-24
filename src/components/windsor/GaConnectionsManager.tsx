import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  startGaOAuth,
  listGaConnections,
  listGaAccountProperties,
  updateGaConnection,
  deleteGaConnection,
} from "@/lib/ga.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Trash2, LineChart } from "lucide-react";

export function GaConnectionsManager({ reportId }: { reportId: string }) {
  const startOAuth = useServerFn(startGaOAuth);
  const listConns = useServerFn(listGaConnections);
  const listProps = useServerFn(listGaAccountProperties);
  const updateConn = useServerFn(updateGaConnection);
  const deleteConn = useServerFn(deleteGaConnection);
  const qc = useQueryClient();

  const [propSel, setPropSel] = useState<Record<string, string>>({});

  const connsQ = useQuery({
    queryKey: ["ga-conns", reportId],
    queryFn: () => listConns({ data: { reportId } }),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["ga-conns", reportId] });

  const connectMut = useMutation({
    mutationFn: () => startOAuth({ data: { reportId } }),
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveMut = useMutation({
    mutationFn: (v: { id: string; ga_property_id: string; label?: string }) =>
      updateConn({ data: v }),
    onSuccess: () => {
      toast.success("Propriedade GA4 vinculada.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteConn({ data: { id } }),
    onSuccess: () => {
      toast.success("Conexão removida.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-3 rounded-xl border border-border/40 bg-background/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-medium text-foreground">
          <LineChart className="h-3.5 w-3.5 text-primary" /> Google Analytics 4
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => connectMut.mutate()}
          disabled={connectMut.isPending}
        >
          {connectMut.isPending ? (
            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="mr-1 h-3.5 w-3.5" />
          )}
          Conectar Google
        </Button>
      </div>

      {connsQ.isLoading ? (
        <div className="flex items-center text-xs text-muted-foreground">
          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Carregando...
        </div>
      ) : connsQ.data && connsQ.data.length > 0 ? (
        <ul className="space-y-2">
          {connsQ.data.map((c) => (
            <GaConnectionRow
              key={c.id}
              conn={c}
              selected={propSel[c.id] ?? (c.ga_property_id === "PENDING" ? "" : c.ga_property_id)}
              onSelect={(v) => setPropSel((s) => ({ ...s, [c.id]: v }))}
              onSave={(propertyId, label) =>
                saveMut.mutate({ id: c.id, ga_property_id: propertyId, label })
              }
              onDelete={() => deleteMut.mutate(c.id)}
              loadProps={() => listProps({ data: { connectionId: c.id } })}
              saving={saveMut.isPending}
              deleting={deleteMut.isPending}
            />
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">
          Nenhuma conexão. Clique em "Conectar Google" para autorizar sua conta.
        </p>
      )}
    </div>
  );
}

function GaConnectionRow({
  conn,
  selected,
  onSelect,
  onSave,
  onDelete,
  loadProps,
  saving,
  deleting,
}: {
  conn: { id: string; ga_property_id: string; label: string | null; google_email: string | null };
  selected: string;
  onSelect: (v: string) => void;
  onSave: (propertyId: string, label: string) => void;
  onDelete: () => void;
  loadProps: () => Promise<Array<{ propertyId: string; displayName: string; account: string }>>;
  saving: boolean;
  deleting: boolean;
}) {
  const propsQ = useQuery({
    queryKey: ["ga-props", conn.id],
    queryFn: loadProps,
    retry: false,
  });

  const isPending = conn.ga_property_id === "PENDING";
  const currentProp = propsQ.data?.find((p) => p.propertyId === selected);

  return (
    <li className="space-y-2 rounded-lg border border-border/40 bg-background/60 p-2.5">
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="text-[10px]">
          GA4
        </Badge>
        <span className="min-w-0 flex-1 truncate text-xs">
          {conn.google_email ?? "Google"}
          {!isPending && (
            <span className="ml-2 text-muted-foreground">· {conn.label || conn.ga_property_id}</span>
          )}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-destructive"
          onClick={onDelete}
          disabled={deleting}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[180px] space-y-1">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Propriedade GA4
          </label>
          <Select value={selected} onValueChange={onSelect} disabled={propsQ.isLoading || !!propsQ.error}>
            <SelectTrigger className="h-8">
              <SelectValue
                placeholder={
                  propsQ.isLoading
                    ? "Carregando..."
                    : propsQ.error
                    ? "Erro ao listar"
                    : "Selecione a propriedade"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {propsQ.data?.map((p) => (
                <SelectItem key={p.propertyId} value={p.propertyId}>
                  {p.displayName} · {p.propertyId}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          size="sm"
          onClick={() => selected && onSave(selected, currentProp?.displayName ?? conn.label ?? "")}
          disabled={!selected || saving || selected === conn.ga_property_id}
        >
          {saving ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
          Salvar
        </Button>
      </div>
      {propsQ.error && (
        <p className="text-[10px] text-destructive">
          {(propsQ.error as Error).message}
        </p>
      )}
    </li>
  );
}

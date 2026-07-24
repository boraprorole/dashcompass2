import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { toast } from "sonner";
import { Plus, Calendar as CalendarIcon, Trash2, User as UserIcon } from "lucide-react";
import {
  createDemanda,
  deleteDemanda,
  listDemandas,
  listTeamMembers,
  updateDemanda,
  DEMANDA_STATUSES,
} from "@/lib/demandas.functions";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<string, string> = {
  pauta: "Pauta",
  planejamento: "Planejamento",
  live: "Live",
  redacao_conteudo: "Redação e Conteúdo",
  criacao: "Criação",
  atendimento: "Atendimento",
  aprovacao_cliente: "Aprovação Cliente",
  publicar: "Publicar",
  finalizado: "Finalizado",
};

type Demanda = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  assignee_id: string | null;
  created_by: string | null;
  company_id: string | null;
  due_date: string | null;
  position: number;
  created_at: string;
  updated_at: string;
};

type Member = { id: string; display_name: string; avatar_url: string | null };

export function DemandasBoard({ mode }: { mode: "mine" | "status" | "assignee" }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const listFn = useServerFn(listDemandas);
  const membersFn = useServerFn(listTeamMembers);
  const createFn = useServerFn(createDemanda);
  const updateFn = useServerFn(updateDemanda);
  const deleteFn = useServerFn(deleteDemanda);

  const demandasQ = useQuery({
    queryKey: ["demandas"],
    queryFn: () => listFn(),
  });
  const membersQ = useQuery({
    queryKey: ["demandas-members"],
    queryFn: () => membersFn(),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["demandas"] });

  const createMut = useMutation({
    mutationFn: (input: {
      title: string;
      description?: string | null;
      status?: string;
      assignee_id?: string | null;
      due_date?: string | null;
    }) => createFn({ data: input }),
    onSuccess: () => {
      toast.success("Demanda criada.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMut = useMutation({
    mutationFn: (input: {
      id: string;
      title?: string;
      description?: string | null;
      status?: string;
      assignee_id?: string | null;
      due_date?: string | null;
      position?: number;
    }) => updateFn({ data: input }),
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Demanda excluída.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const demandas: Demanda[] = demandasQ.data?.demandas ?? [];
  const members: Member[] = membersQ.data?.members ?? [];
  const membersById = useMemo(
    () => Object.fromEntries(members.map((m) => [m.id, m])),
    [members],
  );

  const onDragEnd = (r: DropResult) => {
    if (!r.destination) return;
    const id = r.draggableId;
    const dest = r.destination.droppableId;
    if (mode === "status") {
      if (r.source.droppableId === dest) return;
      updateMut.mutate({ id, status: dest });
    } else if (mode === "assignee") {
      if (r.source.droppableId === dest) return;
      updateMut.mutate({ id, assignee_id: dest === "unassigned" ? null : dest });
    }
  };

  // Group data
  const columns: { id: string; title: string; items: Demanda[] }[] = useMemo(() => {
    if (mode === "mine") {
      const mine = demandas.filter((d) => d.assignee_id === user?.id);
      return DEMANDA_STATUSES.map((s) => ({
        id: s,
        title: STATUS_LABEL[s],
        items: mine.filter((d) => d.status === s),
      }));
    }
    if (mode === "status") {
      return DEMANDA_STATUSES.map((s) => ({
        id: s,
        title: STATUS_LABEL[s],
        items: demandas.filter((d) => d.status === s),
      }));
    }
    // assignee
    const cols: { id: string; title: string; items: Demanda[] }[] = members.map((m) => ({
      id: m.id,
      title: m.display_name,
      items: demandas.filter((d) => d.assignee_id === m.id),
    }));
    cols.push({
      id: "unassigned",
      title: "Sem responsável",
      items: demandas.filter((d) => !d.assignee_id),
    });
    return cols;
  }, [mode, demandas, members, user?.id]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <NewDemandaDialog
          members={members}
          onCreate={(v) => createMut.mutate(v)}
          pending={createMut.isPending}
        />
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map((col) => (
            <Droppable
              droppableId={col.id}
              key={col.id}
              isDropDisabled={mode === "mine"}
            >
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={cn(
                    "flex w-72 shrink-0 flex-col rounded-2xl border border-border/50 bg-card/40 p-3 transition",
                    snapshot.isDraggingOver && "bg-primary/5 border-primary/40",
                  )}
                >
                  <div className="mb-3 flex items-center justify-between px-1">
                    <h3 className="text-sm font-semibold">{col.title}</h3>
                    <Badge variant="secondary" className="rounded-full">
                      {col.items.length}
                    </Badge>
                  </div>
                  <div className="flex flex-1 flex-col gap-2 min-h-[40px]">
                    {col.items.map((d, i) => (
                      <Draggable
                        draggableId={d.id}
                        index={i}
                        key={d.id}
                        isDragDisabled={mode === "mine"}
                      >
                        {(prov, snap) => (
                          <div
                            ref={prov.innerRef}
                            {...prov.draggableProps}
                            {...prov.dragHandleProps}
                            className={cn(
                              "rounded-xl border border-border/60 bg-background/80 p-3 text-sm shadow-sm transition",
                              snap.isDragging && "shadow-elevated ring-1 ring-primary/50",
                            )}
                          >
                            <DemandaCard
                              d={d}
                              members={members}
                              membersById={membersById}
                              onUpdate={(patch) => updateMut.mutate({ id: d.id, ...patch })}
                              onDelete={() => deleteMut.mutate(d.id)}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}

function DemandaCard({
  d,
  members,
  membersById,
  onUpdate,
  onDelete,
}: {
  d: Demanda;
  members: Member[];
  membersById: Record<string, Member>;
  onUpdate: (patch: Partial<Demanda>) => void;
  onDelete: () => void;
}) {
  const assignee = d.assignee_id ? membersById[d.assignee_id] : null;
  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium leading-snug">{d.title}</p>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      {d.description && (
        <p className="line-clamp-2 text-xs text-muted-foreground">{d.description}</p>
      )}
      <div className="flex items-center justify-between gap-2 pt-1">
        <Select
          value={d.assignee_id ?? "unassigned"}
          onValueChange={(v) => onUpdate({ assignee_id: v === "unassigned" ? null : v })}
        >
          <SelectTrigger className="h-7 border-none bg-transparent px-1 text-xs hover:bg-accent">
            <SelectValue>
              {assignee ? (
                <div className="flex items-center gap-1.5">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={assignee.avatar_url ?? undefined} />
                    <AvatarFallback className="text-[10px]">
                      {assignee.display_name[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate max-w-[100px]">{assignee.display_name}</span>
                </div>
              ) : (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <UserIcon className="h-3 w-3" /> Sem resp.
                </span>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">Sem responsável</SelectItem>
            {members.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.display_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {d.due_date && (
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <CalendarIcon className="h-3 w-3" />
            {new Date(d.due_date).toLocaleDateString("pt-BR")}
          </span>
        )}
      </div>
      <Select value={d.status} onValueChange={(v) => onUpdate({ status: v })}>
        <SelectTrigger className="h-7 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DEMANDA_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {STATUS_LABEL[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function NewDemandaDialog({
  members,
  onCreate,
  pending,
}: {
  members: Member[];
  onCreate: (v: {
    title: string;
    description?: string | null;
    status?: string;
    assignee_id?: string | null;
    due_date?: string | null;
  }) => void;
  pending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("pauta");
  const [assignee, setAssignee] = useState<string>("unassigned");
  const [due, setDue] = useState("");

  const submit = () => {
    if (!title.trim()) {
      toast.error("Título obrigatório.");
      return;
    }
    onCreate({
      title: title.trim(),
      description: description.trim() || null,
      status,
      assignee_id: assignee === "unassigned" ? null : assignee,
      due_date: due || null,
    });
    setTitle("");
    setDescription("");
    setStatus("pauta");
    setAssignee("unassigned");
    setDue("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1 h-4 w-4" /> Nova demanda
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova demanda</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            placeholder="Título"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Textarea
            placeholder="Descrição (opcional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Status</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DEMANDA_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Responsável</label>
              <Select value={assignee} onValueChange={setAssignee}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Sem responsável</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.display_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Prazo</label>
            <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={pending}>Criar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

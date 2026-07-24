import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Loader2, PackageCheck, Pencil, Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/entregas")({
  head: () => ({
    meta: [
      { title: "Entregas" },
      { name: "description", content: "Entregas mensais por empresa." },
    ],
  }),
  beforeLoad: async () => {
    const { data, error } = await supabase.from("app_features").select("enabled").eq("key", "/entregas").maybeSingle();
    if (error || (data && !data.enabled)) {
      throw redirect({ to: "/reports" });
    }
  },
  component: EntregasPage,
});

const MONTHS = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

type Entrega = {
  id: string;
  company_id: string;
  title: string;
  month: number;
  year: number;
  quantity: number;
};

function EntregasPage() {
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();

  const profileQ = useQuery({
    queryKey: ["profile-company", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const companiesQ = useQuery({
    queryKey: ["entregas-companies", isAdmin, profileQ.data?.company_id],
    enabled: !!user && (isAdmin || profileQ.isSuccess),
    queryFn: async () => {
      let query = supabase.from("companies").select("id, name").order("name");
      if (!isAdmin) {
        if (!profileQ.data?.company_id) return [];
        query = query.eq("id", profileQ.data.company_id);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const [companyId, setCompanyId] = useState<string>("");
  const [year, setYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    if (!companyId && companiesQ.data && companiesQ.data.length > 0) {
      setCompanyId(companiesQ.data[0].id);
    }
  }, [companiesQ.data, companyId]);

  const singleCompany = (companiesQ.data?.length ?? 0) === 1;

  const entregasQ = useQuery({
    queryKey: ["entregas", companyId, year],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entregas")
        .select("id, company_id, title, month, year, quantity")
        .eq("company_id", companyId)
        .eq("year", year);
      if (error) throw error;
      return (data ?? []) as Entrega[];
    },
  });

  // pivot: title -> month -> sum(quantity)
  const rows = useMemo(() => {
    const map = new Map<string, { title: string; months: number[]; ids: string[] }>();
    (entregasQ.data ?? []).forEach((e) => {
      const key = e.title.trim();
      const row =
        map.get(key) ?? { title: key, months: Array(12).fill(0) as number[], ids: [] as string[] };
      row.months[e.month - 1] += e.quantity;
      row.ids.push(e.id);
      map.set(key, row);
    });
    return Array.from(map.values()).sort((a, b) =>
      a.title.localeCompare(b.title, "pt-BR"),
    );
  }, [entregasQ.data]);

  const years = useMemo(() => {
    const current = new Date().getFullYear();
    return [current - 1, current, current + 1];
  }, []);

  const [addOpen, setAddOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [entryYear, setEntryYear] = useState<number>(year);
  const [quantity, setQuantity] = useState<number>(1);

  useEffect(() => {
    if (addOpen) setEntryYear(year);
  }, [addOpen, year]);

  const addMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("entregas").insert({
        company_id: companyId,
        title: title.trim(),
        month,
        year: entryYear,
        quantity,
        created_by: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Entrega adicionada.");
      setAddOpen(false);
      setTitle("");
      setQuantity(1);
      qc.invalidateQueries({ queryKey: ["entregas"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("entregas").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Entrega removida.");
      qc.invalidateQueries({ queryKey: ["entregas"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [editOpen, setEditOpen] = useState(false);
  const [editIds, setEditIds] = useState<string[]>([]);
  const [editTitle, setEditTitle] = useState("");
  const [editMonths, setEditMonths] = useState<number[]>(Array(12).fill(0));

  const openEdit = (row: { title: string; months: number[]; ids: string[] }) => {
    setEditIds(row.ids);
    setEditTitle(row.title);
    setEditMonths([...row.months]);
    setEditOpen(true);
  };

  const editMut = useMutation({
    mutationFn: async () => {
      const newTitle = editTitle.trim();
      if (!newTitle) throw new Error("Informe a entrega.");
      if (editIds.length) {
        const { error: delErr } = await supabase
          .from("entregas")
          .delete()
          .in("id", editIds);
        if (delErr) throw delErr;
      }
      const rows = editMonths
        .map((q, i) => ({ month: i + 1, quantity: q }))
        .filter((r) => r.quantity > 0)
        .map((r) => ({
          company_id: companyId,
          title: newTitle,
          month: r.month,
          year,
          quantity: r.quantity,
          created_by: user?.id ?? null,
        }));
      if (rows.length) {
        const { error: insErr } = await supabase.from("entregas").insert(rows);
        if (insErr) throw insErr;
      }
    },
    onSuccess: () => {
      toast.success("Entrega atualizada.");
      setEditOpen(false);
      qc.invalidateQueries({ queryKey: ["entregas"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <PackageCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Entregas</h1>
            <p className="text-sm text-muted-foreground">
              Consolidação mensal de entregas por empresa.
            </p>
          </div>
        </div>

        {isAdmin && companyId && (
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Adicionar entrega
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova entrega</DialogTitle>
              </DialogHeader>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!title.trim()) {
                    toast.error("Informe a entrega.");
                    return;
                  }
                  if (quantity < 1) {
                    toast.error("Quantidade deve ser maior que 0.");
                    return;
                  }
                  addMut.mutate();
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor="e-title">Entrega</Label>
                  <Input
                    id="e-title"
                    value={title}
                    onChange={(ev) => setTitle(ev.target.value)}
                    placeholder="Ex: Post Instagram, Reels, Reunião..."
                    maxLength={200}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Mês</Label>
                    <Select
                      value={String(month)}
                      onValueChange={(v) => setMonth(Number(v))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.map((m, i) => (
                          <SelectItem key={m} value={String(i + 1)}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Ano</Label>
                    <Select
                      value={String(entryYear)}
                      onValueChange={(v) => setEntryYear(Number(v))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {years.map((y) => (
                          <SelectItem key={y} value={String(y)}>
                            {y}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="e-qty">Quantidade</Label>
                  <Input
                    id="e-qty"
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(ev) => setQuantity(Number(ev.target.value))}
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={addMut.isPending}>
                    {addMut.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Adicionar
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </header>

      <div className="glass-strong flex flex-wrap items-center gap-3 rounded-3xl p-4">
        {!singleCompany && (
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Empresa</Label>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger className="w-[240px]">
                <SelectValue placeholder="Selecione uma empresa" />
              </SelectTrigger>
              <SelectContent>
                {companiesQ.data?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Ano</Label>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="glass-strong overflow-hidden rounded-3xl">
        {companiesQ.isLoading || profileQ.isLoading ? (
          <div className="flex items-center justify-center p-12 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando...
          </div>
        ) : !companyId ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            Nenhuma empresa disponível.
          </div>
        ) : entregasQ.isLoading ? (
          <div className="flex items-center justify-center p-12 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando entregas...
          </div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            Nenhuma entrega registrada para {year}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-background/40">
                  <th className="sticky left-0 z-10 bg-background/60 px-4 py-3 text-left font-medium text-muted-foreground">
                    Entrega
                  </th>
                  {MONTHS.map((m) => (
                    <th
                      key={m}
                      className="px-3 py-3 text-center font-medium text-muted-foreground"
                    >
                      {m}
                    </th>
                  ))}
                  <th className="px-3 py-3 text-center font-medium text-muted-foreground">
                    Total
                  </th>
                  {isAdmin && <th className="w-10" />}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const total = r.months.reduce((a, b) => a + b, 0);
                  return (
                    <tr key={r.title} className="border-b border-border/20">
                      <td className="sticky left-0 z-10 bg-background/40 px-4 py-3 font-medium">
                        {r.title}
                      </td>
                      {r.months.map((v, i) => (
                        <td
                          key={i}
                          className={`px-3 py-3 text-center tabular-nums ${
                            v === 0 ? "text-muted-foreground/40" : ""
                          }`}
                        >
                          {v || "—"}
                        </td>
                      ))}
                      <td className="px-3 py-3 text-center font-semibold tabular-nums">
                        {total}
                      </td>
                      {isAdmin && (
                        <td className="px-2">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEdit(r)}
                              title="Editar linha"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Remover "{r.title}"?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Todas as {r.ids.length} entrega(s) desta linha
                                    em {year} serão removidas.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteMut.mutate(r.ids)}
                                  >
                                    Remover
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar entrega ({year})</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              editMut.mutate();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="edit-title">Entrega</Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(ev) => setEditTitle(ev.target.value)}
                maxLength={200}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Quantidade por mês</Label>
              <div className="grid grid-cols-4 gap-2">
                {MONTHS.map((m, i) => (
                  <div key={m} className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{m}</Label>
                    <Input
                      type="number"
                      min={0}
                      value={editMonths[i]}
                      onChange={(ev) => {
                        const v = Math.max(0, Number(ev.target.value) || 0);
                        setEditMonths((prev) => {
                          const next = [...prev];
                          next[i] = v;
                          return next;
                        });
                      }}
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Meses com quantidade 0 não gerarão registros.
              </p>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={editMut.isPending}>
                {editMut.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

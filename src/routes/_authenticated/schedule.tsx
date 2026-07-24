import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState, useEffect, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "@/components/ui/calendar";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  CalendarDays, 
  Loader2, 
  Building2, 
  ChevronLeft, 
  ChevronRight,
  Plus,
  MoreVertical,
  ExternalLink,
  Target,
  Layout,
  Share2,
  Trash2,
  Check,
  X,
  ThumbsUp,
  ThumbsDown,
  GripVertical,
  Download

} from "lucide-react";
import { MultiSelect } from "@/components/ui/multi-select";
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays,
  eachDayOfInterval,
  parseISO
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  HoverCard, 
  HoverCardContent, 
  HoverCardTrigger 
} from "@/components/ui/hover-card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/schedule")({
  head: () => ({
    meta: [{ title: "Cronograma" }],
  }),
  beforeLoad: async () => {
    const { data, error } = await supabase.from("app_features").select("enabled").eq("key", "/schedule").maybeSingle();
    if (error || (data && !data.enabled)) {
      throw redirect({ to: "/reports" });
    }
  },
  component: SchedulePage,
});

// Helper to parse social network field robustly
const parseSocialNetworks = (value: any): string[] => {
  if (!value) return [];
  
  // If it's already an array, clean it up and return
  if (Array.isArray(value)) {
    return [...new Set(value.map(v => String(v).trim()).filter(Boolean))];
  }

  const unwrap = (val: any): any => {
    let current = val;
    let depth = 0;
    // Limit depth to avoid infinite loops if data is weird
    while (typeof current === 'string' && depth < 5) {
      const trimmed = current.trim();
      // Only try to parse if it looks like JSON (starts with [ or " or {)
      if (trimmed.startsWith('[') || trimmed.startsWith('"') || trimmed.startsWith('{')) {
        try {
          const parsed = JSON.parse(current);
          if (parsed === current) break;
          current = parsed;
          depth++;
        } catch (e) {
          break;
        }
      } else {
        break;
      }
    }
    return current;
  };

  let root = unwrap(value);
  
  if (Array.isArray(root)) {
    const results: string[] = [];
    const process = (arr: any[]) => {
      arr.forEach(item => {
        const unwrapped = unwrap(item);
        if (Array.isArray(unwrapped)) {
          process(unwrapped);
        } else if (unwrapped !== null && unwrapped !== undefined) {
          results.push(String(unwrapped).trim());
        }
      });
    };
    process(root);
    return [...new Set(results.filter(Boolean))];
  }
  
  if (typeof root === 'string' && root.length > 0) {
    // Handle comma-separated strings if we somehow got one
    return [...new Set(root.split(',').map(s => s.trim()).filter(Boolean))];
  }
  
  return [];
};

function SchedulePage() {
  const [view, setView] = useState<"month" | "week" | "feed" | "kanban">("month");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date()));
  const [selectedCompany, setSelectedCompany] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const isKanban = new URLSearchParams(window.location.search).get("view") === "kanban";
    if (isKanban) setView("kanban");
  }, []);


  const { data: userRole, isLoading: loadingRole } = useQuery({
    queryKey: ["user-role"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const roles = data?.map(r => r.role) || [];
      return { roles, isAdmin: roles.includes("admin"), isTeam: roles.includes("team") };
    },
  });

  const isAdmin = !!userRole?.isAdmin;
  const isTeam = !!userRole?.isTeam;
  const canReproveAfterApproved = isAdmin || isTeam;

  const { data: userProfile } = useQuery({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("id, company_id, display_name")
        .eq("id", user.id)
        .single();
      return { ...data, email: user.email };
    },
  });


  const { data: companies, isLoading: loadingCompanies } = useQuery({
    queryKey: ["companies", isAdmin, userProfile?.company_id],
    queryFn: async () => {
      let query = supabase.from("companies").select("id, name").order("name");
      
      if (!isAdmin && userProfile?.company_id) {
        query = query.eq("id", userProfile.company_id);
      } else if (!isAdmin && !userProfile?.company_id) {
        // If not admin and no company, return empty
        return [];
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: loadingRole === false,
  });

  useEffect(() => {
    if (!isAdmin && companies && companies.length > 0 && selectedCompany === "all") {
      setSelectedCompany(companies[0].id);
    }
  }, [isAdmin, companies, selectedCompany]);

  const { data: events, isLoading: loadingEvents } = useQuery({
    queryKey: ["schedule-events", selectedCompany, format(currentMonth, "yyyy-MM"), isAdmin, userProfile?.company_id],
    queryFn: async () => {
      const start = view === "month" ? startOfMonth(currentMonth) : (view === "week" ? currentWeek : startOfMonth(currentMonth));
      const end = view === "month" ? endOfMonth(currentMonth) : (view === "week" ? addDays(currentWeek, 6) : endOfMonth(currentMonth));
      
      let query = supabase
        .from("schedule_events")
        .select("*, companies(name)")
        .gte("event_date", format(start, "yyyy-MM-dd"))
        .lte("event_date", format(end, "yyyy-MM-dd"));

      if (selectedCompany !== "all") {
        query = query.eq("company_id", selectedCompany);
      } else if (!isAdmin) {
        // If "all" is selected but user is not admin, filter by their company
        if (userProfile?.company_id) {
          query = query.eq("company_id", userProfile.company_id);
        } else {
          // If no company linked, return nothing
          return [];
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: loadingRole === false,
  });

  const { data: scheduleConfig } = useQuery({
    queryKey: ["schedule-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schedule_config")
        .select("*")
        .order("label");
      if (error) throw error;
      return data || [];
    },
  });

  const createEventMutation = useMutation({
    mutationFn: async (newEvent: any) => {
      const { error } = await supabase.from("schedule_events").insert([newEvent]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedule-events"] });
      toast.success("Evento criado com sucesso!");
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast.error("Erro ao criar evento: " + error.message);
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { error } = await supabase
        .from("schedule_events")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedule-events"] });
      toast.success("Evento atualizado com sucesso!");
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast.error("Erro ao atualizar evento: " + error.message);
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("schedule_events")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedule-events"] });
      toast.success("Evento removido com sucesso!");
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast.error("Erro ao remover evento: " + error.message);
    },
  });

  const approvalMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "approved" | "rejected" | null }) => {
      const displayName =
        userProfile?.display_name ||
        userProfile?.email?.split("@")[0] ||
        "Usuário";
      const updates =
        status === null
          ? { approval_status: null, approved_by: null, approved_by_name: null, approved_at: null }
          : {
              approval_status: status,
              approved_by: userProfile?.id ?? null,
              approved_by_name: displayName,
              approved_at: new Date().toISOString(),
            };
      const { error } = await supabase.from("schedule_events").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["schedule-events"] });
      toast.success(vars.status === "approved" ? "Card aprovado!" : vars.status === "rejected" ? "Card reprovado." : "Aprovação removida.");
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar aprovação: " + (error?.message || "desconhecido"));
    },
  });

  const canApprove = (event: any) => event?.approval_status !== "approved";
  const canReject = (event: any) => {
    if (event?.approval_status === "rejected") return false;
    if (event?.approval_status === "approved") return canReproveAfterApproved;
    return true;
  };

  const renderApprovalStatus = (event: any) => {
    if (event?.approval_status === "approved") {
      return (
        <div className="flex items-center gap-1 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
          <Check className="h-3 w-3" />
          <span>Aprovado{event.approved_by_name ? ` por ${event.approved_by_name}` : ""}</span>
        </div>
      );
    }
    if (event?.approval_status === "rejected") {
      return (
        <div className="flex items-center gap-1 text-[10px] font-medium text-red-700 dark:text-red-400">
          <X className="h-3 w-3" />
          <span>Reprovado{event.approved_by_name ? ` por ${event.approved_by_name}` : ""}</span>
        </div>
      );
    }
    return null;
  };

  const renderApprovalActions = (event: any, opts?: { size?: "sm" | "xs"; stopPropagation?: boolean; stack?: boolean }) => {
    const size = opts?.size ?? "xs";
    const stop = opts?.stopPropagation ?? true;
    const stack = opts?.stack ?? false;
    const h = size === "sm" ? "h-7" : "h-6";
    const px = size === "sm" ? "px-2" : "px-1.5";
    const txt = size === "sm" ? "text-xs" : "text-[10px]";
    const approveEnabled = canApprove(event) && !approvalMutation.isPending;
    const rejectEnabled = canReject(event) && !approvalMutation.isPending;
    return (
      <div className={cn("flex gap-1", stack ? "flex-col items-stretch" : "items-center")}>

        {approveEnabled && (
          <button
            type="button"
            onClick={(e) => {
              if (stop) e.stopPropagation();
              approvalMutation.mutate({ id: event.id, status: "approved" });
            }}
            className={cn(
              "inline-flex items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 transition font-semibold",
              h, px, txt,
            )}
          >
            <ThumbsUp className="h-3 w-3" /> Aprovar
          </button>
        )}
        {rejectEnabled && (
          <button
            type="button"
            onClick={(e) => {
              if (stop) e.stopPropagation();
              approvalMutation.mutate({ id: event.id, status: "rejected" });
            }}
            className={cn(
              "inline-flex items-center gap-1 rounded-md border border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-400 hover:bg-red-500/20 transition font-semibold",
              h, px, txt,
            )}
          >
            <ThumbsDown className="h-3 w-3" /> Reprovar
          </button>
        )}
      </div>
    );
  };


  const onDragEnd = (result: DropResult) => {
    if (!isAdmin || !result.destination) return;

    
    const { draggableId, destination, source } = result;
    
    if (view === "kanban") {
      const newStage = destination.droppableId;
      const oldStage = source.droppableId;
      
      if (newStage !== oldStage) {
        updateEventMutation.mutate({
          id: draggableId,
          kanban_stage: newStage
        });
      }
      return;
    }

    const newDate = destination.droppableId;
    const event = events?.find(e => e.id === draggableId);
    if (event && event.event_date !== newDate) {
      updateEventMutation.mutate({
        id: draggableId,
        event_date: newDate
      });
    }
  };

  const nextRange = () => {
    if (view === "month") {
      setCurrentMonth(addMonths(currentMonth, 1));
    } else {
      setCurrentWeek(addDays(currentWeek, 7));
    }
  };

  const prevRange = () => {
    if (view === "month") {
      setCurrentMonth(subMonths(currentMonth, 1));
    } else {
      setCurrentWeek(addDays(currentWeek, -7));
    }
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    setCurrentWeek(startOfWeek(today));
  };

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const openCreateDialog = (date: Date) => {
    if (!isAdmin) return;
    setSelectedDate(date);
    setEditingEvent(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (event: any) => {
    setEditingEvent(event);
    setSelectedDate(parseISO(event.event_date));
    setIsDialogOpen(true);
  };

  const exportMonthPdf = async () => {
    const [{ default: jsPDF }, autoTableMod] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);
    const autoTable = (autoTableMod as any).default ?? (autoTableMod as any);

    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);

    let query = supabase
      .from("schedule_events")
      .select("*, companies(name)")
      .gte("event_date", format(start, "yyyy-MM-dd"))
      .lte("event_date", format(end, "yyyy-MM-dd"))
      .order("event_date", { ascending: true });

    if (selectedCompany !== "all") {
      query = query.eq("company_id", selectedCompany);
    } else if (!isAdmin && userProfile?.company_id) {
      query = query.eq("company_id", userProfile.company_id);
    }

    const { data, error } = await query;
    if (error) {
      console.error(error);
      return;
    }

    const monthLabel = format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR });
    const companyLabel =
      selectedCompany === "all"
        ? "Todas as empresas"
        : companies?.find((c) => c.id === selectedCompany)?.name ?? "";

    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(16);
    doc.text(`Cronograma — ${monthLabel}`, 14, 15);
    doc.setFontSize(10);
    doc.text(companyLabel, 14, 22);

    const rows = (data || []).map((ev: any) => [
      format(parseISO(ev.event_date), "dd/MM/yyyy"),
      ev.companies?.name ?? "",
      ev.title ?? "",
      ev.editorial_line ?? "",
      Array.isArray(ev.social_networks) ? ev.social_networks.join(", ") : "",
      ev.status ?? "",
      ev.approval_status === "approved"
        ? `Aprovado${ev.approved_by_name ? ` por ${ev.approved_by_name}` : ""}`
        : ev.approval_status === "rejected"
        ? `Reprovado${ev.approved_by_name ? ` por ${ev.approved_by_name}` : ""}`
        : "Pendente",
      ev.description ?? "",
    ]);

    autoTable(doc, {
      startY: 28,
      head: [[
        "Data",
        "Empresa",
        "Título",
        "Linha editorial",
        "Redes",
        "Status",
        "Aprovação",
        "Descrição",
      ]],
      body: rows,
      styles: { fontSize: 8, cellPadding: 2, overflow: "linebreak" },
      headStyles: { fillColor: [30, 30, 30] },
      columnStyles: {
        0: { cellWidth: 22 },
        2: { cellWidth: 45 },
        7: { cellWidth: 60 },
      },
    });

    doc.save(`cronograma-${format(currentMonth, "yyyy-MM")}.pdf`);
  };

  const renderHeader = () => {
    return (
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-end mb-8 w-full max-w-full overflow-hidden">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center bg-muted/50 rounded-lg p-1 mr-2">
            <Button 
              variant={view === "month" ? "secondary" : "ghost"} 
              size="sm" 
              onClick={() => setView("month")}
              className="h-8 text-xs"
            >
              Mês
            </Button>
            <Button 
              variant={view === "week" ? "secondary" : "ghost"} 
              size="sm" 
              onClick={() => setView("week")}
              className="h-8 text-xs"
            >
              Semana
            </Button>
            <Button 
              variant={view === "feed" ? "secondary" : "ghost"} 
              size="sm" 
              onClick={() => setView("feed")}
              className="h-8 text-xs"
            >
              Feed
            </Button>
            {isAdmin && (
              <Button 
                variant={view === "kanban" ? "secondary" : "ghost"} 
                size="sm" 
                onClick={() => setView("kanban")}
                className="h-8 text-xs"
              >
                Kanban
              </Button>
            )}
          </div>

          {isAdmin && (
            <Button onClick={() => openCreateDialog(new Date())} className="gap-2">
              <Plus className="h-4 w-4" /> Add
            </Button>
          )}

          <Button variant="outline" onClick={exportMonthPdf} className="gap-2 h-9">
            <Download className="h-4 w-4" /> PDF
          </Button>

          <div className="flex items-center glass rounded-xl p-1">
            <Button variant="ghost" size="icon" onClick={prevRange} className="h-8 w-8">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              className="px-3 py-1 text-sm font-medium" 
              onClick={goToToday}
            >
              Hoje
            </Button>
            <Button variant="ghost" size="icon" onClick={nextRange} className="h-8 w-8">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select 
              value={format(currentMonth, "M")} 
              onValueChange={(val) => {
                const newMonth = new Date(currentMonth);
                newMonth.setMonth(parseInt(val) - 1);
                setCurrentMonth(newMonth);
                if (view === "week") setCurrentWeek(startOfWeek(newMonth));
              }}
            >
              <SelectTrigger className="w-[110px] glass h-9">
                <SelectValue placeholder="Mês" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }).map((_, i) => (
                  <SelectItem key={i + 1} value={(i + 1).toString()}>
                    {format(new Date(2024, i, 1), "MMMM", { locale: ptBR })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select 
              value={format(currentMonth, "yyyy")} 
              onValueChange={(val) => {
                const newMonth = new Date(currentMonth);
                newMonth.setFullYear(parseInt(val));
                setCurrentMonth(newMonth);
                if (view === "week") setCurrentWeek(startOfWeek(newMonth));
              }}
            >
              <SelectTrigger className="w-[85px] glass h-9">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 11 }).map((_, i) => {
                  const year = new Date().getFullYear() - 5 + i;
                  return (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            {loadingCompanies ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                <SelectTrigger className="w-[160px] glass h-9">
                  <SelectValue placeholder="Empresa" />
                </SelectTrigger>
                <SelectContent>
                  {isAdmin && <SelectItem value="all">Todas as empresas</SelectItem>}
                  {companies?.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </header>
    );
  };

  const renderDays = () => {
    if (view === "feed" || view === "kanban") return null;
    const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    return (
      <div className="grid grid-cols-7 mb-2">
        {days.map((day) => (
          <div key={day} className="text-center text-sm font-semibold text-muted-foreground py-2">
            {day}
          </div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    if (view === "feed") {
      const sortedEvents = [...(events || [])].sort((a, b) => 
        new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
      );

      return (
        <div className="flex flex-col gap-6 max-w-2xl mx-auto py-4">
          {sortedEvents.length > 0 ? (
            sortedEvents.map((event) => (
              <div 
                key={event.id}
                onClick={() => openEditDialog(event)}
                className="glass-strong p-6 rounded-2xl cursor-pointer hover:scale-[1.01] transition-transform border border-border/40 shadow-xl"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <Badge variant="outline" className="text-[10px] uppercase font-bold mb-1">
                      {event.companies?.name}
                    </Badge>
                    <h3 className="text-xl font-bold">{event.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {format(parseISO(event.event_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  <Badge className="font-semibold uppercase tracking-wider">
                    {event.kanban_stage || "Idéia"}
                  </Badge>
                </div>

                {event.description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-3 italic">
                    {event.description}
                  </p>
                )}

                <div className="space-y-4 mt-4 pt-4 border-t border-border/20">
                  <div className="flex flex-wrap gap-2">
                    {event.objective && (
                      <Badge variant="outline" className="text-[10px] bg-primary/5 border-primary/20">
                        {event.objective}
                      </Badge>
                    )}
                    {event.funnel_stage && (
                      <Badge variant="outline" className="text-[10px] bg-secondary/5 border-secondary/20">
                        {event.funnel_stage}
                      </Badge>
                    )}
                    {event.editorial_line && (
                      <Badge variant="outline" className="text-[10px] bg-accent/5 border-accent/40">
                        {event.editorial_line}
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-wrap gap-1">
                      {event.social_network && parseSocialNetworks(event.social_network).map((sn: string, i: number) => (
                        <Badge key={i} variant="secondary" className="text-[10px]">{sn}</Badge>
                      ))}
                      {event.format && <Badge variant="outline" className="text-[10px]">{event.format}</Badge>}
                    </div>
                  
                    {event.drive_link && (
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-8 ml-auto gap-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (event.drive_link) window.open(event.drive_link, '_blank');
                        }}
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> Drive
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-3 border-t border-border/20">
                    {renderApprovalStatus(event) ?? <span className="text-[10px] text-muted-foreground">Aguardando aprovação</span>}
                    {renderApprovalActions(event, { size: "sm" })}
                  </div>
                </div>

              </div>
            ))
          ) : (
            <div className="text-center py-20 bg-muted/20 rounded-2xl border-2 border-dashed border-border/40">
              <p className="text-muted-foreground">Nenhum card agendado para este período.</p>
            </div>
          )}
        </div>
      );
    }

    if (view === "kanban" && isAdmin) {
      const kanbanStages = ["Idéia", "Em produção", "Pronto", "Postado"];
      
      return (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-3 pb-4 h-[calc(100vh-200px)] min-h-[500px] w-full max-w-full overflow-hidden">
            {kanbanStages.map((stage) => {
              const stageEvents = events?.filter(e => (e.kanban_stage || "Idéia") === stage) || [];
              
              return (
                <div key={stage} className="flex-1 min-w-0 flex flex-col gap-3 h-full">
                  <div className="flex items-center justify-between px-2">
                    <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      {stage}
                      <Badge variant="secondary" className="text-[10px] font-bold h-5 min-w-[20px] justify-center">
                        {stageEvents.length}
                      </Badge>
                    </h3>
                  </div>
                  
                  <Droppable droppableId={stage}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                          "flex-1 rounded-xl p-2 transition-colors flex flex-col gap-3 overflow-y-auto min-h-0",
                          snapshot.isDraggingOver ? "bg-primary/5 ring-2 ring-primary/20" : "bg-muted/30"
                        )}
                      >
                        {stageEvents.map((event, index) => (
                          <Draggable key={event.id} draggableId={event.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                onClick={() => openEditDialog(event)}
                                className={cn(
                                  "glass-strong p-4 rounded-xl cursor-pointer border border-border/40 transition-shadow w-full box-border",
                                  snapshot.isDragging ? "shadow-2xl ring-2 ring-primary scale-[1.02] z-50" : "hover:shadow-md"
                                )}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <Badge variant="outline" className="text-[9px] uppercase font-bold px-1.5 h-4">
                                    {event.companies?.name}
                                  </Badge>
                                  <span className="text-[10px] text-muted-foreground font-medium">
                                    {format(parseISO(event.event_date), "dd/MM")}
                                  </span>
                                </div>
                                <h4 className="text-sm font-bold leading-tight mb-2 break-words overflow-hidden">{event.title}</h4>
                                
                                {event.description && (
                                  <p className="text-[11px] text-muted-foreground mt-1 mb-3 line-clamp-2 whitespace-pre-wrap leading-relaxed break-words">
                                    {event.description}
                                  </p>
                                )}

                                <div className="space-y-2 mt-auto pt-2 border-t border-border/20">
                                  <div className="flex flex-col gap-1.5 text-[10px] text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                      <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 text-[9px] font-bold h-4 px-1.5 border-none">
                                        {stage}
                                      </Badge>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                      {event.format && (
                                        <div className="flex items-center gap-1">
                                          <Layout className="h-3 w-3 shrink-0" />
                                          <span className="truncate">{event.format}</span>
                                        </div>
                                      )}
                                      {event.objective && (
                                        <div className="flex items-center gap-1">
                                          <Target className="h-3 w-3 shrink-0" />
                                          <span className="truncate">{event.objective}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {event.social_network && (
                                    <div className="flex flex-wrap gap-1">
                                      {parseSocialNetworks(event.social_network).slice(0, 2).map((sn: string, i: number) => (
                                        <Badge key={i} variant="secondary" className="text-[9px] h-4 px-1">{sn}</Badge>
                                      ))}
                                      {parseSocialNetworks(event.social_network).length > 2 && (
                                        <span className="text-[8px] text-muted-foreground font-bold">+{parseSocialNetworks(event.social_network).length - 2}</span>
                                      )}
                                    </div>
                                  )}

                                  <div className="flex items-center justify-between gap-1 pt-2 mt-1 border-t border-border/20">
                                    <div className="min-w-0 truncate">
                                      {renderApprovalStatus(event)}
                                    </div>
                                    {renderApprovalActions(event)}
                                  </div>
                                </div>

                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      );
    }

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = view === "month" ? startOfWeek(monthStart) : currentWeek;
    const endDate = view === "month" ? endOfWeek(monthEnd) : addDays(currentWeek, 6);

    const allDays = eachDayOfInterval({ start: startDate, end: endDate });

    return (
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-7 border-t border-l border-border/40 overflow-hidden rounded-xl shadow-2xl shadow-black/5 bg-background/50 backdrop-blur-sm max-w-full">
          {allDays.map((d, idx) => {
            const dateStr = format(d, "yyyy-MM-dd");
            const dayEvents = events?.filter(e => isSameDay(parseISO(e.event_date), d)) || [];
            const isToday = isSameDay(d, new Date());
            const isCurrentMonth = view === "week" || isSameMonth(d, monthStart);

            return (
              <Droppable key={dateStr} droppableId={dateStr} isDropDisabled={!isAdmin || (view === "month" && !isCurrentMonth)}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    onClick={() => isCurrentMonth && openCreateDialog(d)}
                    className={cn(
                      "min-h-[140px] border-r border-b border-border/40 p-2 transition-colors group relative",
                      !isCurrentMonth && "bg-muted/30 opacity-40",
                      isToday && "bg-primary/5",
                      isAdmin && isCurrentMonth && "cursor-pointer hover:bg-accent/50",
                      snapshot.isDraggingOver && "bg-primary/10"
                    )}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className={cn(
                        "text-sm font-medium h-7 w-7 flex items-center justify-center rounded-full",
                        isToday ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                      )}>
                        {format(d, "d")}
                      </span>
                      {isAdmin && isCurrentMonth && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            openCreateDialog(d);
                          }}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    
                    <div className="space-y-1">
                      {dayEvents.map((event, eventIdx) => (
                        <Draggable key={event.id} draggableId={event.id} index={eventIdx} isDragDisabled={!isAdmin}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              style={{
                                ...provided.draggableProps.style,
                                opacity: snapshot.isDragging ? 0.8 : 1,
                              }}
                            >
                              <HoverCard>
                                <HoverCardTrigger asChild>
                                  <div 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openEditDialog(event);
                                    }}
                                    className={cn(
                                      "text-[10px] px-2 py-1.5 rounded-md cursor-pointer transition-transform hover:scale-[1.02]",
                                      "bg-primary/10 text-primary border border-primary/20 shadow-sm",
                                      "flex flex-col gap-1 whitespace-normal break-words leading-tight relative",
                                      snapshot.isDragging && "scale-105 shadow-md z-[1001]"
                                    )}
                                  >
                                    <div className="flex items-center justify-between font-bold border-b border-primary/10 pb-1 mb-1">
                                      <span className="truncate">{event.companies?.name}</span>
                                      {isAdmin && <GripVertical className="h-2 w-2 text-primary/40" />}
                                    </div>
                        <div className="font-medium">{event.title}</div>
                        
                        {event.description && (
                          <div className="text-[11px] text-muted-foreground mt-0.5 italic whitespace-normal break-words leading-snug">
                            {event.description}
                          </div>
                        )}

                        {event.editorial_line && (
                          <div className="mt-1 rounded-sm bg-accent/15 border border-accent/40 px-1.5 py-0.5 text-[10px] leading-tight">
                            <span className="font-bold uppercase tracking-wide text-accent-foreground/80">Linha editorial:</span>{" "}
                            <span className="font-medium">{event.editorial_line}</span>
                          </div>
                        )}

                        {(event.social_network || event.format || event.objective || event.funnel_stage) && (
                          <div className="flex flex-wrap gap-1 mt-1 pt-1 border-t border-primary/5 opacity-80">
                            {event.social_network && (
                              parseSocialNetworks(event.social_network).map((sn: string, i: number) => (
                                <Badge key={i} variant="outline" className="text-[8px] h-3.5 px-1 bg-background/50">{sn}</Badge>
                              ))
                            )}
                            {event.format && <Badge variant="outline" className="text-[8px] h-3.5 px-1 bg-background/50">{event.format}</Badge>}
                            {event.objective && <Badge variant="outline" className="text-[8px] h-3.5 px-1 bg-background/50">{event.objective}</Badge>}
                            {event.funnel_stage && <Badge variant="outline" className="text-[8px] h-3.5 px-1 bg-background/50">{event.funnel_stage}</Badge>}
                          </div>
                        )}
                                    {event.kanban_stage && (
                                      <div className="mt-1">
                                        <Badge className="text-[8px] h-3.5 px-1 uppercase font-bold tracking-tighter">
                                          {event.kanban_stage}
                                        </Badge>
                                      </div>
                                    )}
                                    {(event.approval_status || canApprove(event) || canReject(event)) && (
                                      <div className="mt-1 pt-1 border-t border-primary/10 flex flex-col gap-1">
                                        <div className="min-w-0 truncate">{renderApprovalStatus(event)}</div>
                                        {renderApprovalActions(event, { stack: true })}
                                      </div>

                                    )}
                                  </div>

                                </HoverCardTrigger>
                                <HoverCardContent className="w-80 z-[100]">
                                  <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                      <Badge variant="outline" className="text-[10px] uppercase font-bold">
                                        {event.companies?.name}
                                      </Badge>
                                      <Badge className="text-[10px]">
                                        {event.kanban_stage || "Idéia"}
                                      </Badge>
                                    </div>
                                    <h4 className="text-sm font-bold leading-none">{event.title}</h4>
                                    
                                    <div className="grid grid-cols-2 gap-2">
                                      {event.social_network && (
                                        <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                                          <Share2 className="h-3 w-3 mt-0.5 shrink-0" />
                                          <div className="flex flex-wrap gap-1">
                                            {parseSocialNetworks(event.social_network).map((sn: string, i: number) => (
                                              <Badge key={i} variant="secondary" className="text-[10px] h-5 px-1.5 py-0 font-medium">
                                                {sn}
                                              </Badge>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      {event.format && (
                                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                          <Layout className="h-3 w-3" />
                                          <span>{event.format}</span>
                                        </div>
                                      )}
                                    </div>

                                    {event.objective && (
                                      <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                                        <Target className="h-3 w-3 mt-0.5 shrink-0" />
                                        <span>{event.objective}</span>
                                      </div>
                                    )}

                                    {event.description && (
                                      <p className="text-xs text-muted-foreground leading-relaxed">
                                        {event.description}
                                      </p>
                                    )}

                                    {event.drive_link && (
                                      <Button asChild size="sm" variant="outline" className="w-full h-8 text-xs gap-2">
                                        <a href={event.drive_link} target="_blank" rel="noopener noreferrer">
                                          <ExternalLink className="h-3 w-3" /> Link Drive
                                        </a>
                                      </Button>
                                    )}

                                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/20">
                                      {renderApprovalStatus(event) ?? <span className="text-[11px] text-muted-foreground">Aguardando aprovação</span>}
                                      {renderApprovalActions(event, { size: "sm", stopPropagation: false })}
                                    </div>
                                  </div>
                                </HoverCardContent>

                              </HoverCard>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            );
          })}
        </div>
      </DragDropContext>
    );
  };

  return (
    <div className="mx-auto w-full px-4 py-8 overflow-x-hidden">
      {renderHeader()}
      <div className="relative">
        {loadingEvents && (
          <div className="absolute inset-0 bg-background/20 backdrop-blur-[2px] z-10 flex items-center justify-center rounded-xl">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        {renderDays()}
        {renderCells()}
      </div>

      <CreateEventDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen}
        date={selectedDate}
        editingEvent={editingEvent}
        isAdmin={isAdmin}
        companies={companies || []}
        config={scheduleConfig || []}
        onSubmit={(data) => {
          if (editingEvent) {
            updateEventMutation.mutate({ id: editingEvent.id, ...data });
          } else {
            createEventMutation.mutate(data);
          }
        }}
        onDelete={() => {
          if (editingEvent) deleteEventMutation.mutate(editingEvent.id);
        }}
        isPending={createEventMutation.isPending || updateEventMutation.isPending || deleteEventMutation.isPending}
        renderApprovalStatus={renderApprovalStatus}
        renderApprovalActions={renderApprovalActions}
      />

    </div>
  );
}

function CreateEventDialog({ 
  open, 
  onOpenChange, 
  date, 
  editingEvent,
  isAdmin,
  companies, 
  config,
  onSubmit,
  onDelete,
  isPending,
  renderApprovalStatus,
  renderApprovalActions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date | null;
  editingEvent?: any;
  isAdmin: boolean;
  companies: any[];
  config: any[];
  onSubmit: (data: any) => void;
  onDelete?: () => void;
  isPending: boolean;
  renderApprovalStatus: (event: any) => ReactNode;
  renderApprovalActions: (event: any, opts?: { size?: "sm" | "xs"; stopPropagation?: boolean }) => ReactNode;

}) {

  const [formData, setFormData] = useState({
    title: "",
    company_id: "",
    drive_link: "",
    social_network: [] as string[],
    objective: "",
    format: "",
    funnel_stage: "",
    editorial_line: "",
    kanban_stage: "Idéia",
    description: "",
    event_date: date ? format(date, "yyyy-MM-dd") : "",
  });

  // Update form data when editingEvent changes
  useEffect(() => {
    if (open) {
      if (editingEvent) {
        setFormData({
          title: editingEvent.title || "",
          company_id: editingEvent.company_id || "",
          drive_link: editingEvent.drive_link || "",
          social_network: parseSocialNetworks(editingEvent.social_network),
          objective: editingEvent.objective || "",
          format: editingEvent.format || "",
          funnel_stage: editingEvent.funnel_stage || "",
          editorial_line: editingEvent.editorial_line || "",
          kanban_stage: editingEvent.kanban_stage || "Idéia",
          description: editingEvent.description || "",
          event_date: editingEvent.event_date || (date ? format(date, "yyyy-MM-dd") : ""),
        });
      } else {
        setFormData({
          title: "",
          company_id: "",
          drive_link: "",
          social_network: [],
          objective: "",
          format: "",
          funnel_stage: "",
          editorial_line: "",
          kanban_stage: "Idéia",
          description: "",
          event_date: date ? format(date, "yyyy-MM-dd") : "",
        });
      }
    }
  }, [open, editingEvent, date]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    if (!formData.company_id || !formData.title || !formData.event_date) {
      toast.error("Preencha os campos obrigatórios.");
      return;
    }

    // Ensure we save a clean JSON string representing the array
    const submissionData = {
      ...formData,
      social_network: JSON.stringify(parseSocialNetworks(formData.social_network))
    };

    onSubmit(submissionData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto pt-4">
        <DialogHeader className="space-y-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">
              {isAdmin && !editingEvent ? "Novo Card" : ""}
            </DialogTitle>
          </div>
          {date && !isAdmin && (
            <p className="text-sm text-muted-foreground">
              {format(date, "dd 'de' MMMM", { locale: ptBR })}
            </p>
          )}
        </DialogHeader>
        {editingEvent && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border/40 bg-muted/30 px-3 py-2">
            <div className="text-xs">
              {renderApprovalStatus(editingEvent) ?? <span className="text-muted-foreground">Aguardando aprovação</span>}
            </div>
            {renderApprovalActions(editingEvent, { size: "sm", stopPropagation: false })}
          </div>
        )}
        {!isAdmin ? (
          <div className="py-6 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="flex flex-col gap-3">
                <h2 className="text-2xl font-bold tracking-tight text-primary leading-tight">{formData.title}</h2>
                {formData.event_date && (
                  <p className="text-sm text-muted-foreground font-medium flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    {format(parseISO(formData.event_date), "dd 'de' MMMM", { locale: ptBR })}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                    {companies.find(c => c.id === formData.company_id)?.name}
                  </Badge>
                  <Badge className="font-semibold uppercase tracking-wider">
                    {formData.kanban_stage}
                  </Badge>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-border/40">
                <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-bold">Planejamento</Label>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-accent/30 border border-border/40">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <Share2 className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Rede Social</p>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {Array.isArray(formData.social_network) && formData.social_network.length > 0 ? (
                          formData.social_network.map((sn, i) => (
                            <Badge key={i} variant="outline" className="text-[10px] py-0 h-5">
                              {sn}
                            </Badge>
                          ))
                        ) : (
                          <p className="text-sm font-medium">—</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-xl bg-accent/30 border border-border/40">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <Layout className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Formato</p>
                      <p className="text-sm font-medium">{formData.format || "—"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-xl bg-accent/30 border border-border/40">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <Target className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Objetivo / Funil</p>
                      <p className="text-sm font-medium">
                        {formData.objective || "—"} 
                        {formData.funnel_stage && ` (${formData.funnel_stage})`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-xl bg-accent/30 border border-border/40">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <Target className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Linha Editorial</p>
                      <p className="text-sm font-medium">
                        {formData.editorial_line || "—"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {formData.drive_link && (
                <div className="pt-2">
                  <Button asChild className="w-full gap-2 shadow-lg shadow-primary/20 h-11 rounded-xl">
                    <a href={formData.drive_link} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" /> Acessar Material no Drive
                    </a>
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <Label className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-bold">Conteúdo e Descrição</Label>
              <div className="glass-strong p-5 rounded-2xl min-h-[400px] max-h-[500px] overflow-y-auto overflow-x-hidden break-words whitespace-pre-wrap text-sm leading-relaxed text-foreground/90 italic border-l-4 border-l-primary shadow-inner w-full box-border">
                {formData.description || "Sem descrição informada."}
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="py-4">
            <fieldset disabled={!isAdmin} className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Input 
                    value={formData.title} 
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })} 
                    className="text-lg font-bold border-none px-0 focus-visible:ring-0 placeholder:opacity-50 h-auto"
                    placeholder="Título do post..."
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Empresa *</Label>
                    <Select 
                      value={formData.company_id} 
                      onValueChange={(val) => setFormData({ ...formData, company_id: val })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {companies.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Etapa do Kanban</Label>
                    <Select 
                      value={formData.kanban_stage} 
                      onValueChange={(val) => setFormData({ ...formData, kanban_stage: val })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Idéia">Idéia</SelectItem>
                        <SelectItem value="Em produção">Em produção</SelectItem>
                        <SelectItem value="Pronto">Pronto</SelectItem>
                        <SelectItem value="Postado">Postado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="social">Rede Social</Label>
                    <MultiSelect
                      options={config
                        .filter((c) => c.type === "social_network")
                        .map((c) => ({ label: c.label, value: c.label }))}
                      onValueChange={(val) =>
                        setFormData({ ...formData, social_network: val })
                      }
                      defaultValue={formData.social_network}
                      placeholder="Selecione as redes"
                      className="bg-background"
                      summaryMode={true}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="format">Formato</Label>
                    <Select 
                      value={formData.format} 
                      onValueChange={(val) => setFormData({ ...formData, format: val })}
                    >
                      <SelectTrigger id="format">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {config.filter(c => c.type === 'format').map((c) => (
                          <SelectItem key={c.id} value={c.label}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="objective">Objetivo</Label>
                    <Select 
                      value={formData.objective} 
                      onValueChange={(val) => setFormData({ ...formData, objective: val })}
                    >
                      <SelectTrigger id="objective">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {config.filter(c => c.type === 'objective').map((c) => (
                          <SelectItem key={c.id} value={c.label}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="editorial_line">Linha Editorial</Label>
                    <Input 
                      id="editorial_line" 
                      value={formData.editorial_line} 
                      onChange={(e) => setFormData({ ...formData, editorial_line: e.target.value })} 
                      placeholder="Ex: Conteúdo Educativo"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="funnel">Etapa do Funil</Label>
                    <Select 
                      value={formData.funnel_stage} 
                      onValueChange={(val) => setFormData({ ...formData, funnel_stage: val })}
                    >
                      <SelectTrigger id="funnel">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Topo">Topo</SelectItem>
                        <SelectItem value="Meio">Meio</SelectItem>
                        <SelectItem value="Fundo">Fundo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Data do Post *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.event_date && "text-muted-foreground"
                          )}
                        >
                          <CalendarDays className="mr-2 h-4 w-4" />
                          {formData.event_date ? (
                            format(parseISO(formData.event_date), "dd/MM/yy", { locale: ptBR })
                          ) : (
                            <span>Selecione</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.event_date ? parseISO(formData.event_date) : undefined}
                          onSelect={(date) => 
                            setFormData({ 
                              ...formData, 
                              event_date: date ? format(date, "yyyy-MM-dd") : "" 
                            })
                          }
                          initialFocus
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="drive">Link Drive</Label>
                  <Input 
                    id="drive" 
                    value={formData.drive_link} 
                    onChange={(e) => setFormData({ ...formData, drive_link: e.target.value })} 
                    placeholder="https://..."
                  />
                </div>

                {isAdmin && (
                  <div className="pt-4 flex gap-2">
                    {editingEvent && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button type="button" variant="outline" size="icon" className="h-10 w-10 text-destructive shrink-0">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover evento?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação não pode ser desfeita. O card "{editingEvent.title}" será permanentemente removido.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                    <Button type="submit" disabled={isPending} className="w-full">
                      {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {editingEvent ? "Salvar Alterações" : "Criar Card"}
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="desc">Descrição</Label>
                  <Textarea 
                    id="desc" 
                    value={formData.description} 
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
                    placeholder="Descreva o conteúdo do post..."
                    className="min-h-[400px] md:min-h-[500px] resize-none"
                  />
                </div>
              </div>
            </fieldset>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

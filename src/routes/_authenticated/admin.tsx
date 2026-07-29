import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { listUsers, setUserRole } from "@/lib/admin.functions";
import {
  listReportsAdmin,
  createReport,
  updateReport,
  deleteReport,
  setReportAssignment,
  createReportSection,
  updateReportSection,
  deleteReportSection,
} from "@/lib/reports.functions";
import { Button } from "@/components/ui/button";
import { WindsorConnectionsManager } from "@/components/windsor/WindsorConnectionsManager";
import { GaConnectionsManager } from "@/components/windsor/GaConnectionsManager";
import { RDStationConnectionsManager } from "@/components/rdstation/RDStationConnectionsManager";
import { LinkedInConnectionsManager } from "@/components/linkedin/LinkedInConnectionsManager";
import { PipedriveConnectionsManager } from "@/components/pipedrive/PipedriveConnectionsManager";
import { GoogleAdsCsvManager } from "@/components/googleads/GoogleAdsCsvManager";
import { GoogleUnifiedManager } from "@/components/google/GoogleUnifiedManager";
import { TikTokManager } from "@/components/tiktok/TikTokManager";
import { WindsorSettingsTab } from "@/components/windsor/WindsorSettingsTab";
import { AdminAITab } from "@/components/ai/AdminAITab";
import { AdminDemandasTab } from "@/components/demandas/AdminDemandasTab";
import { AdminRDStationTab } from "@/components/rdstation/AdminRDStationTab";
import { AdminMcpTab } from "@/components/mcp/AdminMcpTab";
import { NewsSettingsTab } from "@/components/news/NewsSettingsTab";
import { Sparkles, Radio, Newspaper, Music2 } from "lucide-react";


import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import {
  Loader2,
  Shield,
  ShieldCheck,
  FileText,
  Plus,
  Pencil,
  Trash2,
  Users,
  ExternalLink,
  Layers,
  Upload,
  X,
  Building2,
  CalendarDays,
  Link2,
  Key,
  Plug,
  ClipboardList,
  Palette,
  Settings,
  CircleDollarSign,
} from "lucide-react";

import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [{ title: "Admin" }, { name: "description", content: "Gerenciamento de usuários e relatórios." }],
  }),
  beforeLoad: async () => {
    const { data: userData, error } = await supabase.auth.getUser();
    if (error || !userData.user) throw redirect({ to: "/login" });

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);
    
    const userRoles = roles?.map(r => r.role) || [];
    const hasAdminAccess = userRoles.some(r => ["admin", "admin_global", "admin_agencia"].includes(r));
    
    if (!hasAdminAccess) throw redirect({ to: "/reports" });

  },
  component: AdminPage,
});

function AdminPage() {
  const { isAdminGlobal, isAdminAgencia } = useAuth();

  const { data: features } = useQuery({
    queryKey: ["app-features"],
    queryFn: async () => {
      const { data, error } = await supabase.from("app_features").select("*");
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });

  const isEnabled = (key: string) => {
    const feature = features?.find(f => f.key === key);
    return feature ? feature.enabled : true;
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Shield className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Administração</h1>
          <p className="text-sm text-muted-foreground">
            {isAdminGlobal ? "Gestão Global do SaaS" : "Gestão da Agência"}
          </p>
        </div>
      </header>

      <Tabs defaultValue="reports" className="space-y-6">
        <TabsList className="glass flex h-auto w-full flex-wrap justify-start gap-1">
          <TabsTrigger value="reports" className="gap-2">
            <Building2 className="h-4 w-4" /> Empresas & Relatórios
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" /> Usuários
          </TabsTrigger>
          
          {isAdminGlobal && (
            <TabsTrigger value="visual" className="gap-2">
              <Palette className="h-4 w-4" /> ID Visual
            </TabsTrigger>
          )}
          
          {isAdminGlobal && (
            <TabsTrigger value="pricing" className="gap-2">
              <CircleDollarSign className="h-4 w-4" /> Valores
            </TabsTrigger>
          )}

          {isAdminGlobal && (
            <TabsTrigger value="features" className="gap-2">
              <Settings className="h-4 w-4" /> Funções
            </TabsTrigger>
          )}

          {isEnabled("/schedule") && (
            <TabsTrigger value="schedule" className="gap-2">
              <CalendarDays className="h-4 w-4" /> Cronograma
            </TabsTrigger>
          )}

          <TabsTrigger value="windsor" className="gap-2">
            <Key className="h-4 w-4" /> Windsor
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-2">
            <Sparkles className="h-4 w-4" /> AI
          </TabsTrigger>
          
          {isEnabled("/demandas") && (
            <TabsTrigger value="demandas" className="gap-2">
              <ClipboardList className="h-4 w-4" /> Demandas
            </TabsTrigger>
          )}

          <TabsTrigger value="mcp" className="gap-2">
            <Radio className="h-4 w-4" /> MCP
          </TabsTrigger>
          <TabsTrigger value="news" className="gap-2">
            <Newspaper className="h-4 w-4" /> NewsAPI
          </TabsTrigger>
        </TabsList>


        <TabsContent value="reports">
          <CompaniesTab />
        </TabsContent>
        <TabsContent value="users">
          <UsersTab />
        </TabsContent>
        <TabsContent value="visual">
          <VisualIdTab />
        </TabsContent>
        <TabsContent value="features">
          <FeaturesTab />
        </TabsContent>
        <TabsContent value="pricing">
          <PricingTab />
        </TabsContent>


        <TabsContent value="schedule">
          <ScheduleConfigTab />
        </TabsContent>
        <TabsContent value="windsor">
          <AgencySettingsTab type="windsor" />
        </TabsContent>
        <TabsContent value="ai">
          <AgencySettingsTab type="ai" />
        </TabsContent>
        <TabsContent value="demandas">
          <AdminDemandasTab />
        </TabsContent>
        <TabsContent value="mcp">
          <AdminMcpTab />
        </TabsContent>
        <TabsContent value="news">
          <AgencySettingsTab type="news" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------------- Users tab ---------------- */

function UsersTab() {
  const fetchUsers = useServerFn(listUsers);
  const updateRole = useServerFn(setUserRole);
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => fetchUsers(),
  });

  const mutation = useMutation({
    mutationFn: (vars: { userId: string; role: "admin" | "team" | "conexoes"; assign: boolean }) =>
      updateRole({ data: vars }),

    onSuccess: () => {
      toast.success("Permissões atualizadas.");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="glass-strong overflow-hidden rounded-3xl">
      {isLoading ? (
        <div className="flex items-center justify-center p-12 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando...
        </div>
      ) : error ? (
        <div className="p-8 text-destructive">Erro ao carregar usuários.</div>
      ) : (
        <ul className="divide-y divide-border/40">
          {data?.map((u) => (
            <li key={u.id} className="flex items-center gap-4 p-4 md:p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-sm font-semibold text-primary">
                {u.avatarUrl ? (
                  <img src={u.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  (u.displayName?.[0] || u.email[0] || "U").toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-medium">{u.displayName || u.email.split("@")[0]}</p>
                  {u.isAdmin && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary">
                      <ShieldCheck className="h-3 w-3" /> Admin
                    </span>
                  )}
                  {u.isTeam && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-foreground/80">
                      <Users className="h-3 w-3" /> Equipe
                    </span>
                  )}
                  {u.isConexoes && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary">
                      <Plug className="h-3 w-3" /> Conexões
                    </span>
                  )}
                </div>
                <p className="truncate text-xs text-muted-foreground">{u.email}</p>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Equipe</span>
                  <Switch
                    checked={u.isTeam}
                    disabled={mutation.isPending}
                    onCheckedChange={(checked) =>
                      mutation.mutate({ userId: u.id, role: "team", assign: checked })
                    }
                  />
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Conexões</span>
                  <Switch
                    checked={u.isConexoes}
                    disabled={mutation.isPending}
                    onCheckedChange={(checked) =>
                      mutation.mutate({ userId: u.id, role: "conexoes", assign: checked })
                    }
                  />
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Admin</span>
                  <Switch
                    checked={u.isAdmin}
                    disabled={mutation.isPending}
                    onCheckedChange={(checked) =>
                      mutation.mutate({ userId: u.id, role: "admin", assign: checked })
                    }
                  />
                </div>
              </div>

            </li>
          ))}

          {data?.length === 0 && (
            <li className="p-8 text-center text-sm text-muted-foreground">
              Nenhum usuário ainda.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

/* ---------------- Reports tab ---------------- */

type ReportSection = {
  id: string;
  report_id: string;
  title: string;
  embed_code: string | null;
  position: number;
};

type ReportRow = {
  id: string;
  title: string;
  company_id: string | null;
  companies: { name: string } | null;
  description: string | null;
  url: string | null;
  embed_code: string | null;
  logo_url: string | null;
  created_at: string;
  assignedUserIds: string[];
  sections: ReportSection[];
};


function ReportsTab() {
  const fetchReports = useServerFn(listReportsAdmin);
  const fetchUsers = useServerFn(listUsers);
  const createFn = useServerFn(createReport);
  const updateFn = useServerFn(updateReport);
  const deleteFn = useServerFn(deleteReport);
  const assignFn = useServerFn(setReportAssignment);
  const qc = useQueryClient();

  const reportsQ = useQuery({
    queryKey: ["admin-reports"],
    queryFn: () => fetchReports() as Promise<ReportRow[]>,
  });
  const usersQ = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => fetchUsers(),
  });

  const [editing, setEditing] = useState<ReportRow | null>(null);
  const [open, setOpen] = useState(false);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-reports"] });

  const createMut = useMutation({
    mutationFn: (data: { company_id?: string; title?: string; description?: string; url?: string; logo_url?: string | null }) =>
      createFn({ data }),
    onSuccess: () => {
      toast.success("Relatório criado.");
      invalidate();
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const updateMut = useMutation({
    mutationFn: (data: { id: string; company_id?: string; title?: string; description?: string; url?: string; logo_url?: string | null }) =>
      updateFn({ data }),
    onSuccess: () => {
      toast.success("Relatório atualizado.");
      invalidate();
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Relatório removido.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const assignMut = useMutation({
    mutationFn: (vars: { reportId: string; userId: string; assigned: boolean }) =>
      assignFn({ data: vars }),
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Novo relatório
            </Button>
          </DialogTrigger>
          <ReportFormDialog
            title="Criar relatório"
            submitLabel="Criar"
            initial={{
              company_id: "",
              title: "",
              description: "",
              url: "",
              logo_url: "",
            }}
            pending={createMut.isPending}
            onSubmit={(v) => createMut.mutate(v)}
          />
        </Dialog>
      </div>

      <div className="glass-strong overflow-hidden rounded-3xl">
        {reportsQ.isLoading ? (
          <div className="flex items-center justify-center p-12 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando...
          </div>
        ) : reportsQ.error ? (
          <div className="p-8 text-destructive">Erro ao carregar relatórios.</div>
        ) : reportsQ.data?.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            Nenhum relatório criado ainda.
          </div>
        ) : (
          <ul className="divide-y divide-border/40">
            {reportsQ.data?.map((r) => (
              <li key={r.id} className="p-4 md:p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/15 text-primary">
                    {r.logo_url ? (
                      <img
                        src={r.logo_url}
                        alt={r.companies?.name || r.title || "Relatório"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <FileText className="h-5 w-5" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {r.companies?.name || r.title || "Relatório sem empresa"}
                    </p>
                    {r.description && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {r.description}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-muted-foreground">
                      {r.sections.length} seção(ões)
                    </p>

                    <details className="group mt-3">
                      <summary className="cursor-pointer text-xs font-medium text-primary hover:underline">
                        <Layers className="mr-1 inline h-3 w-3" />
                        Gerenciar seções incorporadas
                      </summary>
                      <div className="mt-3">
                        <SectionsManager reportId={r.id} sections={r.sections} />
                      </div>
                    </details>

                    <details className="group mt-2">
                      <summary className="cursor-pointer text-xs font-medium text-primary hover:underline">
                        <Link2 className="mr-1 inline h-3 w-3" />
                        Vincular contas Windsor.ai
                      </summary>
                      <div className="mt-3">
                        <WindsorConnectionsManager reportId={r.id} />
                      </div>
                    </details>

                    <details className="group mt-2">
                      <summary className="cursor-pointer text-xs font-medium text-primary hover:underline">
                        <Link2 className="mr-1 inline h-3 w-3" />
                        Google Ecosystem (OAuth: GA4, GSC, GAds)
                      </summary>
                      <div className="mt-3">
                        <GoogleUnifiedManager reportId={r.id} />
                      </div>
                    </details>

                    <details className="group mt-2">
                      <summary className="cursor-pointer text-xs font-medium text-primary hover:underline">
                        <Link2 className="mr-1 inline h-3 w-3" />
                        RD Station Marketing (OAuth)
                      </summary>
                      <div className="mt-3">
                        <RDStationConnectionsManager reportId={r.id} />
                      </div>
                    </details>

                    <details className="group mt-2">
                      <summary className="cursor-pointer text-xs font-medium text-primary hover:underline">
                        <Link2 className="mr-1 inline h-3 w-3" />
                        LinkedIn Company Page (OAuth)
                      </summary>
                      <div className="mt-3">
                        <LinkedInConnectionsManager reportId={r.id} />
                      </div>
                    </details>

                    <details className="group mt-2">
                      <summary className="cursor-pointer text-xs font-medium text-primary hover:underline">
                        <Link2 className="mr-1 inline h-3 w-3" />
                        TikTok (OAuth)
                      </summary>
                      <div className="mt-3">
                        <TikTokManager reportId={r.id} />
                      </div>
                    </details>


                    <details className="group mt-2">
                      <summary className="cursor-pointer text-xs font-medium text-primary hover:underline">
                        <Link2 className="mr-1 inline h-3 w-3" />
                        Google Ads (upload de CSV)
                      </summary>
                      <div className="mt-3">
                        <GoogleAdsCsvManager reportId={r.id} />
                      </div>
                    </details>
                  </div>



                  <div className="flex shrink-0 items-center gap-1">
                    <Dialog
                      open={editing?.id === r.id}
                      onOpenChange={(o) => setEditing(o ? r : null)}
                    >
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      {editing?.id === r.id && (
                        <ReportFormDialog
                          title="Editar relatório"
                          submitLabel="Salvar"
                          initial={{
                            title: r.title,
                            company_id: r.company_id ?? "",
                            description: r.description ?? "",
                            url: r.url ?? "",
                            logo_url: r.logo_url ?? "",
                          }}
                          pending={updateMut.isPending}
                          onSubmit={(v) => updateMut.mutate({ id: r.id, ...v })}
                        />
                      )}

                    </Dialog>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover relatório?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação não pode ser desfeita. "{r.companies?.name || r.title}" será removido
                            e desvinculado de todos os usuários.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteMut.mutate(r.id)}>
                            Remover
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function CompanySelect({ value, onValueChange }: { value: string; onValueChange: (v: string) => void }) {
  const { isAdminGlobal, agencyId } = useAuth();
  const { data: companies } = useQuery({
    queryKey: ["admin-companies"],
    queryFn: async () => {
      const query = supabase.from("companies").select("id, name").order("name");
      if (!isAdminGlobal && agencyId) {
        query.eq("agency_id", agencyId);
      }
      const { data } = await query;
      return data || [];
    },
  });

  return (
    <Select value={value || "none"} onValueChange={(v) => onValueChange(v === "none" ? "" : v)}>
      <SelectTrigger>
        <SelectValue placeholder="Selecione uma empresa" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">Selecione uma empresa</SelectItem>
        {companies?.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ReportFormDialog({
  title,
  submitLabel,
  initial,
  pending,
  onSubmit,
}: {
  title: string;
  submitLabel: string;
  initial?: { company_id: string; title: string; description: string; url: string; logo_url: string };
  pending: boolean;
  onSubmit: (values: { company_id?: string; title?: string; description?: string; url?: string; logo_url?: string | null }) => void;
}) {
  const [companyId, setCompanyId] = useState(initial?.company_id ?? "");
  const [t, setT] = useState(initial?.title ?? "");
  const [d, setD] = useState(initial?.description ?? "");
  const [u, setU] = useState(initial?.url ?? "");
  const [logoUrl, setLogoUrl] = useState(initial?.logo_url ?? "");
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Imagem deve ter no máximo 2MB.");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("report-logos")
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("report-logos").getPublicUrl(path);
      setLogoUrl(data.publicUrl);
      toast.success("Logo enviado.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({
            company_id: companyId || undefined,
            title: t.trim() || undefined,
            description: d.trim() || undefined,
            url: u.trim() || undefined,
            logo_url: logoUrl.trim() || null,
          });
        }}
        className="space-y-4"
      >
        <div className="space-y-2">
          <Label>Empresa</Label>
          <CompanySelect value={companyId} onValueChange={setCompanyId} />
        </div>
        
        <details className="group">
          <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
            Opções avançadas (Título, Descrição, URL)
          </summary>
          <div className="mt-4 space-y-4 border-t border-border/40 pt-4">
            <div className="space-y-2">
              <Label htmlFor="r-title">Título personalizado (opcional)</Label>
              <Input id="r-title" value={t} onChange={(e) => setT(e.target.value)} maxLength={200} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="r-desc">Descrição (opcional)</Label>
              <Textarea
                id="r-desc"
                value={d}
                onChange={(e) => setD(e.target.value)}
                maxLength={2000}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="r-url">URL externa (opcional)</Label>
              <Input
                id="r-url"
                type="url"
                value={u}
                onChange={(e) => setU(e.target.value)}
                placeholder="https://..."
                maxLength={2000}
              />
            </div>
          </div>
        </details>

        <div className="space-y-2">
          <Label>Logo do relatório (opcional)</Label>
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/40 bg-background/50">
              {logoUrl ? (
                <img src={logoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <FileText className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div className="flex flex-1 flex-wrap items-center gap-2">
              <label className="inline-flex">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUpload(f);
                    e.target.value = "";
                  }}
                />
                <Button asChild type="button" variant="outline" size="sm" disabled={uploading}>
                  <span>
                    {uploading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}
                    {logoUrl ? "Trocar logo" : "Enviar logo"}
                  </span>
                </Button>
              </label>
              {logoUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setLogoUrl("")}
                >
                  <X className="mr-1 h-4 w-4" /> Remover
                </Button>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Se nenhum logo for enviado, o ícone padrão será usado. PNG/JPG até 2MB.
          </p>
        </div>

        <p className="text-xs text-muted-foreground">
          Após criar o relatório, use "Gerenciar seções incorporadas" para
          adicionar uma ou mais abas (ex: Redes Sociais, Performance, Evento).
        </p>
        <DialogFooter>
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitLabel}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

/* ---------------- Sections manager ---------------- */

function SectionsManager({
  reportId,
  sections,
}: {
  reportId: string;
  sections: ReportSection[];
}) {
  const createFn = useServerFn(createReportSection);
  const updateFn = useServerFn(updateReportSection);
  const deleteFn = useServerFn(deleteReportSection);
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-reports"] });

  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const createMut = useMutation({
    mutationFn: (data: { reportId: string; title: string; embed_code?: string }) =>
      createFn({ data }),
    onSuccess: () => {
      toast.success("Seção adicionada.");
      invalidate();
      setAddOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const updateMut = useMutation({
    mutationFn: (data: { id: string; title: string; embed_code?: string }) =>
      updateFn({ data }),
    onSuccess: () => {
      toast.success("Seção atualizada.");
      invalidate();
      setEditingId(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Seção removida.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-3 rounded-xl border border-border/40 bg-background/40 p-3">
      {sections.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Nenhuma seção. Adicione uma para incorporar conteúdo neste relatório.
        </p>
      ) : (
        <ul className="space-y-2">
          {sections.map((s) => (
            <li
              key={s.id}
              className="flex items-center gap-2 rounded-lg border border-border/40 bg-background/60 px-3 py-2"
            >
              <Layers className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {s.title}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {s.embed_code ? "incorporado" : "vazio"}
              </span>
              <Dialog
                open={editingId === s.id}
                onOpenChange={(o) => setEditingId(o ? s.id : null)}
              >
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </DialogTrigger>
                {editingId === s.id && (
                  <SectionFormDialog
                    title="Editar seção"
                    submitLabel="Salvar"
                    initial={{ title: s.title, embed_code: s.embed_code ?? "" }}
                    pending={updateMut.isPending}
                    onSubmit={(v) =>
                      updateMut.mutate({
                        id: s.id,
                        title: v.title,
                        embed_code: v.embed_code,
                      })
                    }
                  />
                )}
              </Dialog>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remover seção?</AlertDialogTitle>
                    <AlertDialogDescription>
                      "{s.title}" será removida deste relatório.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteMut.mutate(s.id)}>
                      Remover
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogTrigger asChild>
          <Button size="sm" variant="outline">
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Adicionar seção
          </Button>
        </DialogTrigger>
        <SectionFormDialog
          title="Nova seção"
          submitLabel="Adicionar"
          pending={createMut.isPending}
          onSubmit={(v) =>
            createMut.mutate({
              reportId,
              title: v.title,
              embed_code: v.embed_code,
            })
          }
        />
      </Dialog>
    </div>
  );
}

function SectionFormDialog({
  title,
  submitLabel,
  initial,
  pending,
  onSubmit,
}: {
  title: string;
  submitLabel: string;
  initial?: { title: string; embed_code: string };
  pending: boolean;
  onSubmit: (values: { title: string; embed_code?: string }) => void;
}) {
  const [t, setT] = useState(initial?.title ?? "");
  const [emb, setEmb] = useState(initial?.embed_code ?? "");

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!t.trim()) return;
          onSubmit({
            title: t.trim(),
            embed_code: emb.trim() || undefined,
          });
        }}
        className="space-y-4"
      >
        <div className="space-y-2">
          <Label htmlFor="s-title">Título da seção</Label>
          <Input
            id="s-title"
            value={t}
            onChange={(e) => setT(e.target.value)}
            maxLength={200}
            placeholder="Ex: Redes Sociais, Performance, Evento..."
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="s-embed">Código de incorporação (iframe)</Label>
          <Textarea
            id="s-embed"
            value={emb}
            onChange={(e) => setEmb(e.target.value)}
            maxLength={10000}
            rows={6}
            placeholder='<iframe src="https://datastudio.google.com/embed/..." width="600" height="338"></iframe>'
            className="font-mono text-xs"
          />
          <p className="text-xs text-muted-foreground">
            Cole o código do iframe (Looker Studio, Power BI, etc). Apenas a URL
            (src) será usada.
          </p>
        </div>
        <DialogFooter>
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitLabel}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}


/* ---------------- Companies + Reports (unified) ---------------- */

function CompaniesTab() {
  const { isAdminGlobal, agencyId } = useAuth();
  const qc = useQueryClient();
  const [newCompanyName, setNewCompanyName] = useState("");
  const [editingCompany, setEditingCompany] = useState<{ id: string; name: string } | null>(null);
  const [newReportForCompany, setNewReportForCompany] = useState<string | null>(null);
  const [editingReport, setEditingReport] = useState<ReportRow | null>(null);

  const fetchReports = useServerFn(listReportsAdmin);
  const createReportFn = useServerFn(createReport);
  const updateReportFn = useServerFn(updateReport);
  const deleteReportFn = useServerFn(deleteReport);

  const { data: companies, isLoading } = useQuery({
    queryKey: ["admin-companies"],
    queryFn: async () => {
      const query = supabase.from("companies").select("*").order("name");
      
      // Se for admin de agência, filtra pela agência dele
      if (!isAdminGlobal && agencyId) {
        query.eq("agency_id", agencyId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const reportsQ = useQuery({
    queryKey: ["admin-reports"],
    queryFn: () => fetchReports() as Promise<ReportRow[]>,
  });

  const { data: users } = useQuery({
    queryKey: ["admin-users-minimal"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, company_id");
      if (error) throw error;
      return data || [];
    },
  });

  const companyLogos: Record<string, string> = {};
  (reportsQ.data ?? []).forEach((r) => {
    if (r.company_id && r.logo_url && !companyLogos[r.company_id]) {
      companyLogos[r.company_id] = r.logo_url;
    }
  });

  const reportsByCompany = new Map<string, ReportRow[]>();
  (reportsQ.data ?? []).forEach((r) => {
    const key = r.company_id ?? "__none";
    const arr = reportsByCompany.get(key) ?? [];
    arr.push(r);
    reportsByCompany.set(key, arr);
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const payload: any = { name };
      
      // Associa a empresa à agência do admin logado
      if (!isAdminGlobal && agencyId) {
        payload.agency_id = agencyId;
      }
      
      const { data: company, error: companyError } = await supabase
        .from("companies")
        .insert([payload])
        .select("id, name")
        .single();
      
      if (companyError) throw companyError;

      // Criar automaticamente um relatório com o mesmo nome da empresa
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Usuário não autenticado");

      const { error: reportError } = await supabase.from("reports").insert([
        {
          title: company.name as string,
          company_id: company.id,
          created_by: userData.user.id,
          agency_id: payload.agency_id || null,
          description: "Relatório gerado automaticamente para " + company.name
        },
      ]);

      if (reportError) {
        console.error("Erro ao criar relatório automático:", reportError);
        toast.error("Empresa criada, mas houve um erro ao gerar o relatório automático.");
      }
    },
    onSuccess: () => {
      toast.success("Empresa criada.");
      setNewCompanyName("");
      qc.invalidateQueries({ queryKey: ["admin-companies"] });
      qc.invalidateQueries({ queryKey: ["admin-reports"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from("companies").update({ name }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Empresa atualizada.");
      setEditingCompany(null);
      qc.invalidateQueries({ queryKey: ["admin-companies"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("companies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Empresa removida.");
      qc.invalidateQueries({ queryKey: ["admin-companies"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const userCompanyMutation = useMutation({
    mutationFn: async ({ userId, companyId }: { userId: string; companyId: string | null }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ company_id: companyId })
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Vínculo atualizado.");
      qc.invalidateQueries({ queryKey: ["admin-users-minimal"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const invalidateReports = () => qc.invalidateQueries({ queryKey: ["admin-reports"] });

  const createReportMut = useMutation({
    mutationFn: (data: { company_id?: string; title?: string; description?: string; url?: string; logo_url?: string | null }) =>
      createReportFn({ data }),
    onSuccess: () => {
      toast.success("Relatório criado.");
      invalidateReports();
      setNewReportForCompany(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const updateReportMut = useMutation({
    mutationFn: (data: { id: string; company_id?: string; title?: string; description?: string; url?: string; logo_url?: string | null }) =>
      updateReportFn({ data }),
    onSuccess: () => {
      toast.success("Relatório atualizado.");
      invalidateReports();
      setEditingReport(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const deleteReportMut = useMutation({
    mutationFn: (id: string) => deleteReportFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Relatório removido.");
      invalidateReports();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const renderReport = (r: ReportRow) => (
    <li key={r.id} className="rounded-xl border border-border/40 bg-background/40 p-3">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary/15 text-primary">
          {r.logo_url ? (
            <img src={r.logo_url} alt={r.title || "Relatório"} className="h-full w-full object-cover" />
          ) : (
            <FileText className="h-4 w-4" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {r.title || r.companies?.name || "Relatório sem título"}
          </p>
          {r.description && (
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{r.description}</p>
          )}
          <p className="mt-1 text-[11px] text-muted-foreground">{r.sections.length} seção(ões)</p>

          <details className="group mt-2">
            <summary className="cursor-pointer text-xs font-medium text-primary hover:underline">
              <Layers className="mr-1 inline h-3 w-3" />
              Gerenciar seções incorporadas
            </summary>
            <div className="mt-2">
              <SectionsManager reportId={r.id} sections={r.sections} />
            </div>
          </details>

          <details className="group mt-2">
            <summary className="cursor-pointer text-xs font-medium text-primary hover:underline">
              <Link2 className="mr-1 inline h-3 w-3" />
              Vincular contas Windsor.ai
            </summary>
            <div className="mt-2">
              <WindsorConnectionsManager reportId={r.id} />
            </div>
          </details>

          <details className="group mt-2">
            <summary className="cursor-pointer text-xs font-medium text-primary hover:underline">
              <Link2 className="mr-1 inline h-3 w-3" />
              Google Ecosystem (OAuth: GA4, GSC, GAds)
            </summary>
            <div className="mt-2">
              <GoogleUnifiedManager reportId={r.id} />
            </div>
          </details>

          <details className="group mt-2">
            <summary className="cursor-pointer text-xs font-medium text-primary hover:underline">
              <Link2 className="mr-1 inline h-3 w-3" />
              RD Station Marketing (OAuth)
            </summary>
            <div className="mt-2">
              <RDStationConnectionsManager reportId={r.id} />
            </div>
          </details>

          <details className="group mt-2">
            <summary className="cursor-pointer text-xs font-medium text-primary hover:underline">
              <Link2 className="mr-1 inline h-3 w-3" />
              LinkedIn Company Page (OAuth)
            </summary>
            <div className="mt-2">
              <LinkedInConnectionsManager reportId={r.id} />
            </div>
          </details>

          <details className="group mt-2">
            <summary className="cursor-pointer text-xs font-medium text-primary hover:underline">
              <Link2 className="mr-1 inline h-3 w-3" />
              TikTok Ads (OAuth)
            </summary>
            <div className="mt-2">
              <TikTokManager reportId={r.id} />
            </div>
          </details>

          <details className="group mt-2">
            <summary className="cursor-pointer text-xs font-medium text-primary hover:underline">
              <Link2 className="mr-1 inline h-3 w-3" />
              Pipedrive CRM (OAuth)
            </summary>
            <div className="mt-2">
              <PipedriveConnectionsManager reportId={r.id} />
            </div>
          </details>

          <details className="group mt-2">
            <summary className="cursor-pointer text-xs font-medium text-primary hover:underline">
              <Link2 className="mr-1 inline h-3 w-3" />
              Google Ads (upload de CSV)
            </summary>
            <div className="mt-2">
              <GoogleAdsCsvManager reportId={r.id} />
            </div>
          </details>
        </div>


        <div className="flex shrink-0 items-center gap-1">
          <Dialog
            open={editingReport?.id === r.id}
            onOpenChange={(o) => setEditingReport(o ? r : null)}
          >
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Pencil className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            {editingReport?.id === r.id && (
              <ReportFormDialog
                title="Editar relatório"
                submitLabel="Salvar"
                initial={{
                  title: r.title,
                  company_id: r.company_id ?? "",
                  description: r.description ?? "",
                  url: r.url ?? "",
                  logo_url: r.logo_url ?? "",
                }}
                pending={updateReportMut.isPending}
                onSubmit={(v) => updateReportMut.mutate({ id: r.id, ...v })}
              />
            )}
          </Dialog>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remover relatório?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. "{r.title || r.companies?.name}" será removido.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => deleteReportMut.mutate(r.id)}>
                  Remover
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </li>
  );

  const orphanReports = reportsByCompany.get("__none") ?? [];

  return (
    <div className="space-y-6">
      <div className="glass-strong p-6 rounded-3xl space-y-4">
        <h3 className="font-medium">Nova Empresa</h3>
        <div className="flex gap-3">
          <Input
            placeholder="Nome da empresa"
            value={newCompanyName}
            onChange={(e) => setNewCompanyName(e.target.value)}
          />
          <Button
            disabled={createMutation.isPending || !newCompanyName.trim()}
            onClick={() => createMutation.mutate(newCompanyName.trim())}
          >
            {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
            Criar
          </Button>
        </div>
      </div>

      {isLoading || reportsQ.isLoading ? (
        <div className="flex items-center justify-center p-12 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando...
        </div>
      ) : (
        <div className="space-y-6">
          {companies?.map((c) => {
            const companyReports = reportsByCompany.get(c.id) ?? [];
            return (
              <div key={c.id} className="glass-strong rounded-3xl p-5 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/15 text-primary">
                    {companyLogos[c.id] ? (
                      <img src={companyLogos[c.id]} alt={c.name} className="h-full w-full object-cover" />
                    ) : (
                      <Building2 className="h-5 w-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    {editingCompany?.id === c.id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editingCompany.name}
                          onChange={(e) => setEditingCompany({ ...editingCompany, name: e.target.value })}
                          className="h-8"
                        />
                        <Button size="sm" onClick={() => updateMutation.mutate(editingCompany)}>Salvar</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingCompany(null)}>Cancelar</Button>
                      </div>
                    ) : (
                      <p className="text-lg font-semibold">{c.name}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setEditingCompany({ id: c.id, name: c.name })}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover empresa?</AlertDialogTitle>
                          <AlertDialogDescription>
                            A empresa "{c.name}" será excluída. Isso não removerá os usuários, mas eles ficarão sem empresa vinculada.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteMutation.mutate(c.id)}>Remover</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                <div className="rounded-xl border border-border/40 bg-background/40 p-3">
                  <h4 className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-3">
                    <Users className="mr-1 inline h-3 w-3" /> Usuários Vinculados
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {users?.filter(u => u.company_id === c.id).map(u => (
                      <Badge key={u.id} variant="secondary" className="gap-1 pr-1">
                        {u.display_name || "Usuário"}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 hover:bg-destructive hover:text-destructive-foreground rounded-full"
                          onClick={() => userCompanyMutation.mutate({ userId: u.id, companyId: null })}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1 px-2">
                          <Plus className="h-3 w-3" /> Vincular Usuário
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Vincular usuário a {c.name}</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-2 py-4 max-h-[300px] overflow-y-auto">
                          {users?.filter(u => u.company_id !== c.id).map(u => (
                            <Button
                              key={u.id}
                              variant="ghost"
                              className="justify-start font-normal h-10"
                              onClick={() => userCompanyMutation.mutate({ userId: u.id, companyId: c.id })}
                            >
                              <div className="flex items-center gap-2">
                                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px]">
                                  {u.display_name?.[0] || "U"}
                                </div>
                                <span>{u.display_name || "Usuário sem nome"}</span>
                                {u.company_id && <span className="text-[10px] text-muted-foreground italic">(Já em outra empresa)</span>}
                              </div>
                            </Button>
                          ))}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                <div className="rounded-xl border border-border/40 bg-background/40 p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                      <FileText className="mr-1 inline h-3 w-3" /> Relatórios ({companyReports.length})
                    </h4>
                    <Dialog
                      open={newReportForCompany === c.id}
                      onOpenChange={(o) => setNewReportForCompany(o ? c.id : null)}
                    >
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" className="h-7 text-xs">
                          <Plus className="mr-1 h-3 w-3" /> Novo relatório
                        </Button>
                      </DialogTrigger>
                      {newReportForCompany === c.id && (
                        <ReportFormDialog
                          title={`Novo relatório · ${c.name}`}
                          submitLabel="Criar"
                          initial={{
                            company_id: c.id,
                            title: "",
                            description: "",
                            url: "",
                            logo_url: "",
                          }}
                          pending={createReportMut.isPending}
                          onSubmit={(v) => createReportMut.mutate({ ...v, company_id: c.id })}
                        />
                      )}
                    </Dialog>
                  </div>
                  {companyReports.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">Nenhum relatório para esta empresa.</p>
                  ) : (
                    <ul className="space-y-2">{companyReports.map(renderReport)}</ul>
                  )}
                </div>
              </div>
            );
          })}
          {companies?.length === 0 && (
            <div className="glass-strong rounded-3xl p-8 text-center text-sm text-muted-foreground">
              Nenhuma empresa cadastrada.
            </div>
          )}

          {orphanReports.length > 0 && (
            <div className="glass-strong rounded-3xl p-5 space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground">
                Relatórios sem empresa vinculada
              </h3>
              <ul className="space-y-2">{orphanReports.map(renderReport)}</ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


function ScheduleConfigTab() {
  const qc = useQueryClient();
  const [newLabel, setNewLabel] = useState("");
  const [selectedType, setSelectedType] = useState<"social_network" | "objective" | "format">("social_network");

  const { data: configs, isLoading } = useQuery({
    queryKey: ["admin-schedule-config"],
    queryFn: async () => {
      const { data, error } = await supabase.from("schedule_config").select("*").order("label");
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (vars: { type: string, label: string }) => {
      const { error } = await supabase.from("schedule_config").insert([vars]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Configuração adicionada.");
      setNewLabel("");
      qc.invalidateQueries({ queryKey: ["admin-schedule-config"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("schedule_config").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Removido com sucesso.");
      qc.invalidateQueries({ queryKey: ["admin-schedule-config"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const renderList = (type: string, title: string) => {
    const filtered = configs?.filter(c => c.type === type) || [];
    return (
      <div className="glass-strong rounded-3xl overflow-hidden">
        <div className="p-4 border-b border-border/40 bg-muted/20">
          <h4 className="font-semibold text-sm uppercase tracking-wider">{title}</h4>
        </div>
        <ul className="divide-y divide-border/40">
          {filtered.map((item) => (
            <li key={item.id} className="flex items-center justify-between p-3 px-4 group hover:bg-accent/30 transition-colors">
              <span className="text-sm">{item.label}</span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => deleteMutation.mutate(item.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="p-4 text-center text-xs text-muted-foreground italic">Nada configurado.</li>
          )}
        </ul>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="glass-strong p-6 rounded-3xl space-y-4">
        <h3 className="font-medium">Nova Opção de Cronograma</h3>
        <div className="grid gap-4 sm:grid-cols-[150px_1fr_auto]">
          <Select value={selectedType} onValueChange={(v: any) => setSelectedType(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="social_network">Rede Social</SelectItem>
              <SelectItem value="objective">Objetivo</SelectItem>
              <SelectItem value="format">Formato</SelectItem>
            </SelectContent>
          </Select>
          <Input 
            placeholder="Ex: Instagram, Reels, Engajamento..." 
            value={newLabel} 
            onChange={(e) => setNewLabel(e.target.value)}
          />
          <Button 
            className="w-full sm:w-auto"
            disabled={createMutation.isPending || !newLabel.trim()}
            onClick={() => createMutation.mutate({ type: selectedType, label: newLabel.trim() })}
          >
            {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
            Adicionar
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {isLoading ? (
          <div className="col-span-3 flex items-center justify-center p-12 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando configurações...
          </div>
        ) : (
          <>
            {renderList("social_network", "Redes Sociais")}
            {renderList("objective", "Objetivos")}
            {renderList("format", "Formatos")}
          </>
        )}
      </div>
    </div>
  );
}

function VisualIdTab() {
  const { primaryColor: contextColor, isAdminGlobal, isAdminAgencia, agencyId } = useAuth();
  const [primaryColor, setPrimaryColor] = useState(contextColor || "#3DFC03");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (contextColor) {
      setPrimaryColor(contextColor);
    }
  }, [contextColor]);

  const handleUpdateColor = async () => {
    setIsSaving(true);
    try {
      if (isAdminGlobal) {
        const { error } = await supabase
          .from("app_settings")
          .upsert({ key: "primary_color", value: primaryColor }, { onConflict: "key" });
        if (error) throw error;
      } else if (isAdminAgencia && agencyId) {
        const { error } = await supabase
          .from("agencies")
          .update({ primary_color: primaryColor })
          .eq("id", agencyId);
        if (error) throw error;
      }

      document.documentElement.style.setProperty("--primary", primaryColor);
      
      // Atualizar o brilho primário dinamicamente
      const r = parseInt(primaryColor.slice(1, 3), 16);
      const g = parseInt(primaryColor.slice(3, 5), 16);
      const b = parseInt(primaryColor.slice(5, 7), 16);
      const primaryGlow = `rgba(${r}, ${g}, ${b}, 0.4)`;
      document.documentElement.style.setProperty("--primary-glow", primaryGlow);
      
      toast.success(`Identidade visual salva com sucesso!`);
      // Não recarrega a página para evitar perda de estado, o useAuth já deve lidar com a cor se recarregado
    } catch (err: any) {
      console.error("Erro ao salvar cor:", err);
      toast.error("Erro ao salvar identidade visual.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="glass-strong p-8 rounded-3xl space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Palette className="h-5 w-5 text-primary" />
        <h3 className="text-xl font-semibold">Identidade Visual</h3>
      </div>
      
      <p className="text-sm text-muted-foreground max-w-lg">
        Personalize a cor de destaque da plataforma. Esta cor será aplicada em botões, links, 
        gráficos e elementos de UI ativos.
      </p>

      <div className="space-y-4 pt-4">
        <div className="space-y-2">
          <Label htmlFor="primaryColor">Cor Primária (Destaque)</Label>
          <div className="flex gap-4 items-center">
            <Input 
              id="primaryColor"
              type="color" 
              value={primaryColor} 
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="w-20 h-12 p-1 bg-[#111] border-border"
            />
            <Input 
              type="text" 
              value={primaryColor} 
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="max-w-[150px]"
            />
          </div>
        </div>

        <div className="pt-4">
          <Button onClick={handleUpdateColor} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {isSaving ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>
      </div>

      <div className="mt-8 p-6 rounded-2xl bg-[#0B0B0B] border border-border">
        <h4 className="text-sm font-medium mb-4 text-muted-foreground uppercase tracking-wider">Preview dos Elementos</h4>
        <div className="flex flex-wrap gap-4">
          <Button>Botão Primário</Button>
          <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-black">
            <Shield className="h-5 w-5" />
          </div>
          <Badge>Status Ativo</Badge>
          <span className="text-primary font-bold">Texto de Destaque</span>
        </div>
      </div>
    </div>
  );
}

function FeaturesTab() {
  const qc = useQueryClient();
  const { data: features, isLoading } = useQuery({
    queryKey: ["app-features"],
    queryFn: async () => {
      const { data, error } = await supabase.from("app_features").select("*").order("label");
      if (error) throw error;
      return data;
    },
  });

  const mutation = useMutation({
    mutationFn: async ({ key, enabled }: { key: string; enabled: boolean }) => {
      const { error } = await supabase.from("app_features").update({ enabled }).eq("key", key);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Função atualizada com sucesso.");
      qc.invalidateQueries({ queryKey: ["app-features"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="glass-strong p-8 rounded-3xl space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Settings className="h-5 w-5 text-primary" />
        <h3 className="text-xl font-semibold">Gerenciar Funções</h3>
      </div>
      
      <p className="text-sm text-muted-foreground max-w-lg">
        Habilite ou desabilite as funcionalidades que aparecem na barra lateral para os usuários.
      </p>

      {isLoading ? (
        <div className="flex items-center justify-center p-12 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando...
        </div>
      ) : (
        <div className="grid gap-4 pt-4">
          {features?.map((f) => (
            <div key={f.key} className="flex items-center justify-between p-4 rounded-2xl bg-[#111] border border-border">
              <div>
                <p className="font-medium">{f.label}</p>
                <p className="text-xs text-muted-foreground">{f.key}</p>
              </div>
              <Switch 
                checked={f.enabled} 
                disabled={mutation.isPending}
                onCheckedChange={(checked) => mutation.mutate({ key: f.key, enabled: checked })}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AgencySettingsTab({ type }: { type: "windsor" | "ai" | "news" }) {
  const { agencyId, isAdminGlobal } = useAuth();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>({});

  const { data: agencyData, isLoading } = useQuery({
    queryKey: ["agency-settings", agencyId, type],
    queryFn: async () => {
      if (!agencyId && !isAdminGlobal) return null;
      const { data, error } = await supabase
        .from("agencies")
        .select("*")
        .eq("id", agencyId as string)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!agencyId || isAdminGlobal,
  });

  useEffect(() => {
    if (agencyData) {
      setData(agencyData);
    }
  }, [agencyData]);

  const handleSave = async () => {
    if (!agencyId) return;
    setLoading(true);
    try {
      const updates: any = {};
      if (type === "windsor") updates.windsor_api_key = data.windsor_api_key;
      if (type === "ai") {
        updates.openai_api_key = data.openai_api_key;
        updates.anthropic_api_key = data.anthropic_api_key;
      }
      if (type === "news") updates.news_api_key = data.news_api_key;

      const { error } = await supabase
        .from("agencies")
        .update(updates)
        .eq("id", agencyId);
      
      if (error) throw error;
      toast.success("Configurações salvas com sucesso!");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) return <div className="p-8 text-center"><Loader2 className="animate-spin inline mr-2" /> Carregando...</div>;

  return (
    <div className="glass-strong p-8 rounded-3xl space-y-6">
      <div className="flex items-center gap-3">
        {type === "windsor" && <Key className="h-5 w-5 text-primary" />}
        {type === "ai" && <Sparkles className="h-5 w-5 text-primary" />}
        {type === "news" && <Newspaper className="h-5 w-5 text-primary" />}
        <h3 className="text-xl font-semibold capitalize">{type === "ai" ? "Inteligência Artificial" : type}</h3>
      </div>

      <div className="grid gap-6">
        {type === "windsor" && (
          <div className="space-y-2">
            <Label>Chave API Windsor.ai</Label>
            <Input 
              type="password" 
              value={data.windsor_api_key || ""} 
              onChange={(e) => setData({ ...data, windsor_api_key: e.target.value })} 
            />
          </div>
        )}
        {type === "ai" && (
          <>
            <div className="space-y-2">
              <Label>Chave OpenAI</Label>
              <Input 
                type="password" 
                value={data.openai_api_key || ""} 
                onChange={(e) => setData({ ...data, openai_api_key: e.target.value })} 
              />
            </div>
            <div className="space-y-2">
              <Label>Chave Anthropic</Label>
              <Input 
                type="password" 
                value={data.anthropic_api_key || ""} 
                onChange={(e) => setData({ ...data, anthropic_api_key: e.target.value })} 
              />
            </div>
          </>
        )}
        {type === "news" && (
          <div className="space-y-2">
            <Label>Chave NewsAPI</Label>
            <Input 
              type="password" 
              value={data.news_api_key || ""} 
              onChange={(e) => setData({ ...data, news_api_key: e.target.value })} 
            />
          </div>
        )}
        
        <Button onClick={handleSave} disabled={loading || !agencyId}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar Configurações
        </Button>
      </div>
    </div>
  );
}

function PricingTab() {
  const qc = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);

  const { data: pricing, isLoading } = useQuery({
    queryKey: ["pricing-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pricing_settings" as any).select("*");
      if (error) throw error;
      return data as any[];
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: any[]) => {
      const { error } = await supabase.from("pricing_settings" as any).upsert(values, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Valores atualizados com sucesso.");
      qc.invalidateQueries({ queryKey: ["pricing-settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const updates = (pricing || []).map(p => ({
      key: p.key,
      value_brl: parseFloat(formData.get(`${p.key}_brl`) as string),
      value_usd: parseFloat(formData.get(`${p.key}_usd`) as string),
    }));
    mutation.mutate(updates);
  };

  if (isLoading) return <div className="p-8 text-center"><Loader2 className="animate-spin inline mr-2" /> Carregando...</div>;

  return (
    <div className="glass-strong p-8 rounded-3xl space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <CircleDollarSign className="h-5 w-5 text-primary" />
        <h3 className="text-xl font-semibold">Configuração de Valores</h3>
      </div>
      
      <p className="text-sm text-muted-foreground max-w-lg">
        Configure os preços dos planos exibidos na Landing Page e no Checkout para BRL e USD.
      </p>

      <form onSubmit={handleSave} className="space-y-6 pt-4">
        <div className="grid gap-6">
          {(pricing as any[])?.map((plan) => (
            <div key={plan.key} className="p-6 rounded-2xl bg-[#111] border border-border space-y-4">
              <h4 className="font-bold uppercase tracking-wider text-primary">{plan.key.replace('_', ' ')}</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor BRL (R$)</Label>
                  <Input 
                    name={`${plan.key}_brl`}
                    type="number" 
                    step="0.01"
                    defaultValue={plan.value_brl}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valor USD ($)</Label>
                  <Input 
                    name={`${plan.key}_usd`}
                    type="number" 
                    step="0.01"
                    defaultValue={plan.value_usd}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Salvar Valores
        </Button>
      </form>
    </div>
  );
}




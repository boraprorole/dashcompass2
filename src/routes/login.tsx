import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Compass } from "lucide-react";


export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar — Relatórios" },
      { name: "description", content: "Acesse sua conta ou cadastre-se para usar o painel." },
    ],
  }),
  beforeLoad: async ({ search }) => {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      const redirectPath = (search as any).redirect || "/reports";
      throw redirect({ to: redirectPath });
    }
  },
  component: LoginPage,
});

const signInSchema = z.object({
  email: z.string().trim().email("Email inválido").max(255),
  password: z.string().min(6, "Mínimo 6 caracteres").max(72),
});

const signUpSchema = signInSchema.extend({
  displayName: z.string().trim().min(2, "Informe seu nome").max(80),
});

function translateAuthError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login") || m.includes("invalid credentials")) return "Email ou senha incorretos.";
  if (m.includes("email not confirmed")) return "Confirme seu email antes de entrar.";
  if (m.includes("user already registered") || m.includes("already registered") || m.includes("already been registered")) return "Este email já está cadastrado.";
  if (m.includes("user not found")) return "Usuário não encontrado.";
  if (m.includes("password should be")) return "Senha muito curta (mínimo 6 caracteres).";
  if (m.includes("rate limit") || m.includes("too many")) return "Muitas tentativas. Aguarde alguns instantes e tente novamente.";
  if (m.includes("network") || m.includes("fetch")) return "Erro de conexão. Verifique sua internet.";
  return msg;
}

function LoginPage() {
  const navigate = useNavigate();
  const search = Route.useSearch() as any;
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  const showError = (msg: string) => {
    setErrorMsg(msg);
    toast.error(msg);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = z.string().trim().email("Email inválido").max(255).safeParse(forgotEmail);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setForgotLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        toast.error(translateAuthError(error.message));
        return;
      }
      toast.success("Se o email existir, enviaremos um link para redefinir a senha.");
      setForgotOpen(false);
      setForgotEmail("");
    } catch (err: any) {
      toast.error(translateAuthError(err?.message ?? "Erro inesperado."));
    } finally {
      setForgotLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        const parsed = signUpSchema.safeParse({ email, password, displayName });
        if (!parsed.success) {
          showError(parsed.error.issues[0].message);
          return;
        }
        const { error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: `${window.location.origin}/reports`,
            data: { display_name: parsed.data.displayName },
          },
        });
        if (error) {
          showError(translateAuthError(error.message));
          return;
        }
        toast.success("Conta criada! Verifique seu email para confirmar.");
        setMode("signin");
      } else {
        const parsed = signInSchema.safeParse({ email, password });
        if (!parsed.success) {
          showError(parsed.error.issues[0].message);
          return;
        }
        const { error } = await supabase.auth.signInWithPassword(parsed.data);
        if (error) {
          showError(translateAuthError(error.message));
          return;
        }
        toast.success("Bem-vindo de volta!");
        const redirectPath = search.redirect || "/reports";
        navigate({ to: redirectPath });
      }
    } catch (err: any) {
      showError(translateAuthError(err?.message ?? "Erro inesperado. Tente novamente."));
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="relative flex min-h-screen items-center justify-center bg-dot-grid px-8 py-12">
      <div className="relative w-full max-w-7xl flex flex-col items-center">
        <div className="mb-12 text-center md:hidden">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Compass className="h-10 w-10 text-primary" />
            <span className="font-sans text-36px font-bold tracking-tighter text-white">
              DashCompass
            </span>

          </div>
          <p className="text-[14px] text-muted-foreground/60 uppercase tracking-widest font-medium">
            Inteligência de Dados Minimalista
          </p>

        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-20 max-w-6xl w-full items-center">
          {/* Lado Esquerdo - Branding Minimalista */}
          <div className="hidden md:flex flex-col justify-center space-y-6">
            <div className="flex items-center gap-6 mb-2">
              <div className="h-20 w-20 rounded-[22px] bg-primary flex items-center justify-center shadow-[0_0_40px_rgba(61,252,3,0.3)]">
                <Compass className="h-10 w-10 text-black stroke-[2.5px]" />
              </div>
              <h1 className="text-64px font-bold tracking-tighter leading-none text-white">
                Dash<span className="text-primary/90">Compass</span>
              </h1>

            </div>
            <div className="h-px w-24 bg-primary/20" />
            <p className="text-18px text-muted-foreground/60 uppercase tracking-[0.2em] font-medium max-w-lg">
              A nova geração de <br />
              <span className="text-white">análise estratégica de marketing</span>
            </p>

          </div>


          {/* Lado Direito - Card de Login */}
          <div className="rounded-[24px] border border-border bg-card p-12 shadow-glass flex flex-col justify-center">
          <Tabs value={mode} onValueChange={(v) => setMode(v as "signin" | "signup")}>
            <TabsList className="grid w-full grid-cols-2 rounded-[14px] bg-[#111] p-1 border border-border">
              <TabsTrigger 
                value="signin"
                className="rounded-[10px] data-[state=active]:bg-primary data-[state=active]:text-black"
              >
                Entrar
              </TabsTrigger>
              <TabsTrigger 
                value="signup"
                className="rounded-[10px] data-[state=active]:bg-primary data-[state=active]:text-black"
              >
                Cadastrar
              </TabsTrigger>
            </TabsList>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <TabsContent value="signup" className="m-0 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="displayName" className="text-sm font-medium text-foreground/80">Nome</Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Como podemos te chamar?"
                    autoComplete="name"
                    maxLength={80}
                  />
                </div>
              </TabsContent>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-foreground/80">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@email.com"
                  autoComplete="email"
                  required
                  maxLength={255}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-foreground/80">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  required
                  minLength={6}
                  maxLength={72}
                />
              </div>

              {mode === "signin" && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => { setForgotEmail(email); setForgotOpen(true); }}
                    className="text-xs text-primary hover:underline"
                  >
                    Esqueci minha senha
                  </button>
                </div>
              )}

              {errorMsg && (
                <div
                  role="alert"
                  className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  {errorMsg}
                </div>
              )}

              <Button type="submit" className="w-full h-12 text-[15px] font-bold" size="lg" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === "signin" ? "Entrar" : "Criar conta"}
              </Button>

            </form>
          </Tabs>
        </div>
      </div>


        <p className="mt-6 text-center text-xs text-muted-foreground">
          Ao continuar, você concorda com os nossos termos de uso.
        </p>
      </div>

      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redefinir senha</DialogTitle>
            <DialogDescription>
              Informe seu email e enviaremos um link para criar uma nova senha.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="forgot-email">Email</Label>
              <Input
                id="forgot-email"
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="voce@email.com"
                autoComplete="email"
                required
                maxLength={255}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setForgotOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={forgotLoading}>
                {forgotLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enviar link
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

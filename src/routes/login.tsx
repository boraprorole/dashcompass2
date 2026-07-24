import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Compass } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import bgVideoAsset from "@/assets/login-bg.mp4.asset.json";


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
    <div className="relative min-h-screen w-full overflow-hidden flex items-center justify-center font-sans">
      {/* Camada 1: Vídeo Background */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 h-full w-full object-cover pointer-events-none"
      >
        <source src={bgVideoAsset.url} type="video/mp4" />
      </video>

      {/* Camada 2: Overlay Escuro */}
      <div 
        className="absolute inset-0 z-10 pointer-events-none" 
        style={{ background: 'rgba(8, 8, 8, 0.72)' }} 
      />

      {/* Camada 3: Glass Blur Sutil */}
      <div 
        className="absolute inset-0 z-20 pointer-events-none" 
        style={{ 
          background: 'rgba(8, 8, 8, 0.18)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)'
        }} 
      />

      {/* Camada 4: Interface de Login */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-30 w-full max-w-[520px] px-4"
      >
        <div className="flex flex-col space-y-12 py-12">
          <div className="flex flex-col items-center mb-16">
            <div className="h-20 w-20 rounded-[22px] bg-primary flex items-center justify-center shadow-[0_0_40px_rgba(61,252,3,0.3)] mb-8">
              <Compass className="h-10 w-10 text-black stroke-[2.5px]" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-white mb-4">
              DashCompass
            </h1>
            <p className="text-[16px] text-white/40 font-medium tracking-widest uppercase">
              A nova geração de análise estratégica
            </p>
          </div>

          <Tabs value={mode} onValueChange={(v) => setMode(v as "signin" | "signup")} className="w-full">
            <TabsList className="grid w-full grid-cols-2 rounded-[18px] bg-white/[0.03] p-1.5 border border-white/[0.05] mb-12">
              <TabsTrigger 
                value="signin"
                className="rounded-[10px] py-2.5 data-[state=active]:bg-primary data-[state=active]:text-black text-white/60"
              >
                Entrar
              </TabsTrigger>
              <TabsTrigger 
                value="signup"
                className="rounded-[10px] py-2.5 data-[state=active]:bg-primary data-[state=active]:text-black text-white/60"
              >
                Cadastrar
              </TabsTrigger>
            </TabsList>

            <form onSubmit={handleSubmit} className="space-y-8">
              <AnimatePresence mode="wait">
                {mode === "signup" && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2 overflow-hidden"
                  >
                    <Label htmlFor="displayName" className="text-sm font-medium text-white/80">Nome</Label>
                    <Input
                      id="displayName"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Como podemos te chamar?"
                      autoComplete="name"
                      maxLength={80}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/20 h-12 rounded-[14px] focus:ring-primary/20"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-white/80">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@email.com"
                  autoComplete="email"
                  required
                  maxLength={255}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/20 h-12 rounded-[14px] focus:ring-primary/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-white/80">Senha</Label>
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
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/20 h-12 rounded-[14px] focus:ring-primary/20"
                />
              </div>

              {mode === "signin" && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => { setForgotEmail(email); setForgotOpen(true); }}
                    className="text-xs text-primary hover:text-primary/80 transition-colors"
                  >
                    Esqueci minha senha
                  </button>
                </div>
              )}

              {errorMsg && (
                <div
                  role="alert"
                  className="rounded-[14px] border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                >
                  {errorMsg}
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full h-14 text-black bg-primary hover:bg-primary/90 rounded-[18px] text-[16px] font-bold shadow-[0_0_20px_rgba(61,252,3,0.2)]" 
                size="lg" 
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                {mode === "signin" ? "Acessar DashCompass" : "Criar minha conta"}
              </Button>
            </form>
          </Tabs>

          <p className="mt-8 text-center text-[12px] text-white/30 font-medium">
            Ao continuar, você concorda com os nossos termos de uso.
          </p>
        </div>
      </motion.div>
      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="bg-[#171717] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Redefinir senha</DialogTitle>
            <DialogDescription className="text-white/60">
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
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setForgotOpen(false)} className="text-white/60 hover:text-white">
                Cancelar
              </Button>
              <Button type="submit" disabled={forgotLoading} className="bg-primary text-black hover:bg-primary/90">
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

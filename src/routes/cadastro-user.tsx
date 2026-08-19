import { createFileRoute, redirect, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { motion } from "framer-motion";
import bgVideoAsset from "@/assets/login-bg-final.mp4.asset.json";

export const Route = createFileRoute("/cadastro-user")({
  head: () => ({
    meta: [
      { title: "Criar conta de usuário — DashCompass" },
      {
        name: "description",
        content:
          "Crie sua conta de usuário DashCompass para visualizar relatórios e gerenciar conexões de dados.",
      },
      { property: "og:title", content: "Criar conta de usuário — DashCompass" },
      {
        property: "og:description",
        content:
          "Crie sua conta de usuário DashCompass para visualizar relatórios e gerenciar conexões de dados.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/reports" });
  },
  component: CadastroUserPage,
});

const schema = z.object({
  displayName: z.string().trim().min(2, "Informe seu nome").max(80),
  email: z.string().trim().email("Email inválido").max(255),
  password: z.string().min(6, "Mínimo 6 caracteres").max(72),
});

function translateAuthError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("already registered") || m.includes("already been registered"))
    return "Este email já está cadastrado.";
  if (m.includes("password should be")) return "Senha muito curta (mínimo 6 caracteres).";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Muitas tentativas. Aguarde alguns instantes e tente novamente.";
  return msg;
}

function CadastroUserPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sent, setSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const parsed = schema.safeParse({ displayName, email, password });
    if (!parsed.success) {
      const msg = parsed.error.issues[0].message;
      setErrorMsg(msg);
      toast.error(msg);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/reports`,
          data: { display_name: parsed.data.displayName },
        },
      });
      if (error) {
        const msg = translateAuthError(error.message);
        setErrorMsg(msg);
        toast.error(msg);
        return;
      }
      if (data.session) {
        toast.success("Conta criada!");
        navigate({ to: "/reports" });
        return;
      }
      setSent(true);
      toast.success("Conta criada! Confirme seu email para acessar.");
    } catch (err) {
      const msg = translateAuthError(
        err instanceof Error ? err.message : "Erro inesperado. Tente novamente.",
      );
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex items-center justify-center font-sans">
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 h-full w-full object-cover pointer-events-none"
      >
        <source src={bgVideoAsset.url} type="video/mp4" />
      </video>
      <div className="absolute inset-0 z-10 pointer-events-none" style={{ background: "rgba(8, 8, 8, 0.72)" }} />
      <div
        className="absolute inset-0 z-20 pointer-events-none"
        style={{
          background: "rgba(8, 8, 8, 0.18)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-30 w-full max-w-[480px] px-6"
      >
        <div className="flex flex-col space-y-8 py-8 md:py-12">
          <div className="flex justify-center mb-6">
            <Logo iconClassName="h-10 w-10" textClassName="text-4xl" className="gap-4" />
          </div>

          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-white">Criar conta de usuário</h1>
            <p className="text-sm text-white/50">
              Acesso para visualizar relatórios e gerenciar conexões.
            </p>
          </div>

          {sent ? (
            <div className="rounded-[18px] border border-primary/30 bg-primary/10 px-5 py-6 text-center text-sm text-white/80">
              Enviamos um link de confirmação para <strong>{email}</strong>. Confirme para acessar
              seus relatórios.
              <div className="mt-4">
                <Link to="/login" className="text-primary underline">
                  Ir para o login
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="displayName" className="text-sm font-semibold text-white/50 ml-1">
                  NOME
                </Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Como podemos te chamar?"
                  autoComplete="name"
                  maxLength={80}
                  required
                  className="bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/20 h-12 rounded-[16px] focus:ring-primary/20 transition-all duration-300 focus:border-primary/50"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="email" className="text-sm font-semibold text-white/50 ml-1">
                  EMAIL
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@email.com"
                  autoComplete="email"
                  required
                  maxLength={255}
                  className="bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/20 h-12 rounded-[16px] focus:ring-primary/20 transition-all duration-300 focus:border-primary/50"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="password" className="text-sm font-semibold text-white/50 ml-1">
                  SENHA
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  maxLength={72}
                  className="bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/20 h-12 rounded-[16px] focus:ring-primary/20 transition-all duration-300 focus:border-primary/50"
                />
              </div>

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
                size="lg"
                disabled={loading}
                className="w-full h-14 text-black bg-primary hover:bg-primary/90 rounded-[20px] text-[16px] font-bold shadow-[0_10px_30px_rgba(61,252,3,0.15)] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              >
                {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                Criar minha conta
              </Button>

              <p className="text-center text-[12px] text-white/40">
                Já tem conta?{" "}
                <Link to="/login" className="text-primary/80 hover:text-primary underline">
                  Entrar
                </Link>
              </p>
            </form>
          )}

          <p className="text-center text-[12px] text-white/30 font-medium">
            Ao continuar, você concorda com os nossos{" "}
            <Link to="/terms" className="text-primary/60 hover:text-primary underline transition-colors">
              termos de uso
            </Link>{" "}
            e{" "}
            <Link to="/privacy" className="text-primary/60 hover:text-primary underline transition-colors">
              política de privacidade
            </Link>
            .
          </p>
        </div>
      </motion.div>
    </div>
  );
}

import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, ArrowRight, Building2, User, CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { motion, AnimatePresence } from "framer-motion";
import bgVideoAsset from "@/assets/login-bg-final.mp4.asset.json";
import { createCheckoutSession } from "@/lib/stripe.functions";
import { useServerFn } from "@tanstack/react-start";

export const Route = createFileRoute("/cadastro-empresa")({
  head: () => ({
    meta: [
      { title: "Cadastro — DashCompass" },
      { name: "description", content: "Cadastre sua agência ou empresa no DashCompass." },
    ],
  }),
  component: RegistrationPage,
});

const registrationSchema = z.object({
  email: z.string().trim().email("Email inválido").max(255),
  password: z.string().min(6, "Mínimo 6 caracteres").max(72),
  displayName: z.string().trim().min(2, "Informe seu nome").max(80),
  companyName: z.string().trim().min(2, "Informe o nome da empresa").max(100),
});

function RegistrationPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    displayName: "",
    companyName: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.id]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const parsed = registrationSchema.safeParse(formData);
      if (!parsed.success) {
        toast.error(parsed.error.issues[0].message);
        setLoading(false);
        return;
      }

      // 1. Sign Up User
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: {
          data: { 
            display_name: parsed.data.displayName,
          },
        },
      });

      if (authError) {
        toast.error(authError.message);
        setLoading(false);
        return;
      }

      if (!authData.user) {
        toast.error("Erro ao criar usuário.");
        setLoading(false);
        return;
      }

      // 2. We'll handle agency/company creation after email confirmation or via a trigger.
      // For now, inform the user to check their email.
      toast.success("Conta criada! Verifique seu email para confirmar e concluir o cadastro da sua empresa.");
      navigate({ to: "/login" });
      
    } catch (err: any) {
      toast.error(err?.message ?? "Erro inesperado.");
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

      <div className="absolute inset-0 z-10 bg-black/70 pointer-events-none" />
      <div className="absolute inset-0 z-20 backdrop-blur-md pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-30 w-full max-w-[540px] px-6"
      >
        <div className="bg-black/40 border border-white/10 p-8 md:p-10 rounded-[32px] backdrop-blur-xl">
          <div className="flex justify-center mb-8">
            <Logo iconClassName="h-8 w-8" textClassName="text-2xl" />
          </div>

          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-white mb-2">Comece agora</h1>
            <p className="text-white/40">Cadastre sua agência e unifique seus dados com IA.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="displayName" className="text-xs font-bold text-white/50 ml-1 uppercase tracking-widest">Seu Nome</Label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
                  <Input
                    id="displayName"
                    value={formData.displayName}
                    onChange={handleChange}
                    placeholder="Nome completo"
                    required
                    className="bg-white/5 border-white/10 text-white pl-11 h-12 rounded-2xl focus:border-primary/50 transition-all"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyName" className="text-xs font-bold text-white/50 ml-1 uppercase tracking-widest">Nome da Empresa</Label>
                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
                  <Input
                    id="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    placeholder="Nome da sua agência"
                    required
                    className="bg-white/5 border-white/10 text-white pl-11 h-12 rounded-2xl focus:border-primary/50 transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-bold text-white/50 ml-1 uppercase tracking-widest">Email Profissional</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="voce@empresa.com"
                required
                className="bg-white/5 border-white/10 text-white h-12 rounded-2xl focus:border-primary/50 transition-all"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-bold text-white/50 ml-1 uppercase tracking-widest">Senha</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Mínimo 6 caracteres"
                required
                className="bg-white/5 border-white/10 text-white h-12 rounded-2xl focus:border-primary/50 transition-all"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full h-14 bg-primary text-black hover:bg-primary/90 rounded-2xl font-bold text-lg transition-all active:scale-95"
              disabled={loading}
            >
              {loading ? <Loader2 className="animate-spin h-5 w-5" /> : <>Continuar para Assinatura <ArrowRight className="ml-2 h-5 w-5" /></>}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-white/30">
            Já tem uma conta? <Link to="/login" className="text-primary hover:underline">Fazer login</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

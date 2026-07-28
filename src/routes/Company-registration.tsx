import { createFileRoute, useNavigate, Link, useSearch } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, ArrowRight, Building2, User, CheckCircle2, Briefcase } from "lucide-react";
import { Logo } from "@/components/Logo";
import { motion, AnimatePresence } from "framer-motion";
import bgVideoAsset from "@/assets/login-bg-final.mp4.asset.json";
import { createCheckoutSession } from "@/lib/stripe.functions";
import { useServerFn } from "@tanstack/react-start";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/Company-registration")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      lang: (search.lang as "pt" | "en") || "en",
    };
  },
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
  accountType: z.enum(["personal", "business", "agency"]),
  taxId: z.string().trim().optional(),
});

function RegistrationPage() {
  const navigate = useNavigate();
  const startCheckout = useServerFn(createCheckoutSession);
  const search = useSearch({ from: "/Company-registration" });
  
  const [step, setStep] = useState<"account" | "plan">("account");
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    displayName: "",
    companyName: "",
    accountType: "business" as "personal" | "business" | "agency",
    taxId: "",
  });
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const isPT = search.lang === "pt";

  const t = useMemo(() => ({
    title: isPT ? "Crie sua conta" : "Create your account",
    subtitle: isPT ? "Dados básicos para sua agência no DashCompass." : "Basic data for your agency on DashCompass.",
    labelName: isPT ? "Seu Nome" : "Your Name",
    placeholderName: isPT ? "Nome completo" : "Full name",
    labelCompany: isPT ? "Nome da Empresa" : "Company Name",
    placeholderCompany: isPT ? "Nome da sua agência" : "Agency name",
    labelEmail: isPT ? "Email Profissional" : "Professional Email",
    placeholderEmail: isPT ? "voce@empresa.com" : "you@company.com",
    labelPassword: isPT ? "Senha" : "Password",
    placeholderPassword: isPT ? "Mínimo 6 caracteres" : "Min. 6 characters",
    labelTaxId: isPT ? (formData.accountType === 'personal' ? 'CPF' : 'CNPJ') : 'Tax ID',
    placeholderTaxId: isPT ? (formData.accountType === 'personal' ? '000.000.000-00' : '00.000.000/0000-00') : 'ID Number',
    labelAccountType: isPT ? "Tipo de Conta" : "Account Type",
    typePersonal: isPT ? "Pessoa Física" : "Personal",
    typeBusiness: isPT ? "Empresa" : "Business",
    typeAgency: isPT ? "Agência" : "Agency",
    nextStep: isPT ? "Próximo Passo" : "Next Step",
    back: isPT ? "Voltar" : "Back",
    subscribe: isPT ? "Assinar Agora" : "Subscribe Now",
    hasAccount: isPT ? "Já tem uma conta?" : "Already have an account?",
    login: isPT ? "Fazer login" : "Login",
    secure: isPT ? "Assinatura processada de forma segura via" : "Secure subscription processed via",
    plansTitle: isPT ? "Escolha seu plano" : "Choose your plan",
    plansSubtitle: isPT ? "Selecione a melhor opção para sua operação." : "Select the best option for your operation.",
    perMonth: isPT ? "/mês" : "/mo",
  }), [isPT, formData.accountType]);

  const plans = [
    { id: "starter", name: "Starter", price: isPT ? "R$ 99" : "$29", features: isPT ? ["1 Empresa", "5 Conexões", "Dashboards IA"] : ["1 Company", "5 Connections", "AI Dashboards"] },
    { id: "agency", name: "Agency", price: isPT ? "R$ 159" : "$99", features: isPT ? ["10 Empresas", "100 Conexões", "White Label"] : ["10 Companies", "100 Connections", "White Label"] },
    { id: "pro", name: "Agency Pro", price: isPT ? "R$ 499" : "$249", features: isPT ? ["20 Empresas", "200 Conexões", "White Label Completo"] : ["20 Companies", "200 Connections", "Full White Label"] },
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.id]: e.target.value }));
  };

  const handleTypeChange = (type: "personal" | "business" | "agency") => {
    setFormData(prev => ({ ...prev, accountType: type }));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);

    try {
      const parsed = registrationSchema.safeParse(formData);
      if (!parsed.success) {
        toast.error(parsed.error.issues[0].message);
        setLoading(false);
        return;
      }

      if (step === "account") {
        setStep("plan");
        setLoading(false);
        return;
      }

      if (!selectedPlan) {
        toast.error(isPT ? "Selecione um plano para continuar." : "Select a plan to continue.");
        setLoading(false);
        return;
      }

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
        toast.error(isPT ? "Erro ao criar usuário." : "Error creating user.");
        setLoading(false);
        return;
      }

      const checkout = await startCheckout({
        data: {
          email: parsed.data.email,
          companyName: parsed.data.companyName,
          planId: selectedPlan,
          origin: window.location.origin,
        }
      });

      if (checkout?.url) {
        toast.success(isPT ? "Redirecionando para o pagamento..." : "Redirecting to payment...");
        window.location.href = checkout.url;
      } else {
        toast.success(isPT ? "Conta criada! Verifique seu email para confirmar." : "Account created! Check your email to confirm.");
        navigate({ to: "/login" });
      }
      
    } catch (err: any) {
      toast.error(err?.message ?? (isPT ? "Erro inesperado." : "Unexpected error."));
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
        className="relative z-30 w-full max-w-[540px] px-6 py-12"
      >
        <div className="bg-black/40 border border-white/10 p-8 md:p-10 rounded-[32px] backdrop-blur-xl">
          <div className="flex justify-center mb-8">
            <Link to="/">
              <Logo iconClassName="h-8 w-8" textClassName="text-2xl" />
            </Link>
          </div>

          <AnimatePresence mode="wait">
            {step === "account" ? (
              <motion.div
                key="account-step"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <div className="text-center mb-10">
                  <h1 className="text-3xl font-bold text-white mb-2">{t.title}</h1>
                  <p className="text-white/40">{t.subtitle}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Account Type Selector */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-white/50 ml-1 uppercase tracking-widest">{t.labelAccountType}</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'personal', label: t.typePersonal, icon: User },
                        { id: 'business', label: t.typeBusiness, icon: Building2 },
                        { id: 'agency', label: t.typeAgency, icon: Briefcase },
                      ].map((type) => (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => handleTypeChange(type.id as any)}
                          className={cn(
                            "flex flex-col items-center justify-center gap-2 p-3 rounded-xl border text-[10px] font-bold uppercase tracking-tight transition-all",
                            formData.accountType === type.id 
                              ? "bg-primary text-black border-primary shadow-[0_0_15px_rgba(61,252,3,0.3)]"
                              : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
                          )}
                        >
                          <type.icon className="h-4 w-4" />
                          {type.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="displayName" className="text-xs font-bold text-white/50 ml-1 uppercase tracking-widest">{t.labelName}</Label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
                        <Input
                          id="displayName"
                          value={formData.displayName}
                          onChange={handleChange}
                          placeholder={t.placeholderName}
                          required
                          className="bg-white/5 border-white/10 text-white pl-11 h-12 rounded-2xl focus:border-primary/50 transition-all"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="companyName" className="text-xs font-bold text-white/50 ml-1 uppercase tracking-widest">{t.labelCompany}</Label>
                      <div className="relative">
                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
                        <Input
                          id="companyName"
                          value={formData.companyName}
                          onChange={handleChange}
                          placeholder={t.placeholderCompany}
                          required
                          className="bg-white/5 border-white/10 text-white pl-11 h-12 rounded-2xl focus:border-primary/50 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Tax ID Field */}
                  <div className="space-y-2">
                    <Label htmlFor="taxId" className="text-xs font-bold text-white/50 ml-1 uppercase tracking-widest">{t.labelTaxId}</Label>
                    <Input
                      id="taxId"
                      value={formData.taxId}
                      onChange={handleChange}
                      placeholder={t.placeholderTaxId}
                      required
                      className="bg-white/5 border-white/10 text-white h-12 rounded-2xl focus:border-primary/50 transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs font-bold text-white/50 ml-1 uppercase tracking-widest">{t.labelEmail}</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder={t.placeholderEmail}
                      required
                      className="bg-white/5 border-white/10 text-white h-12 rounded-2xl focus:border-primary/50 transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-xs font-bold text-white/50 ml-1 uppercase tracking-widest">{t.labelPassword}</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder={t.placeholderPassword}
                      required
                      className="bg-white/5 border-white/10 text-white h-12 rounded-2xl focus:border-primary/50 transition-all"
                    />
                  </div>

                  <Button 
    type="submit" 
                    className="w-full h-14 bg-primary text-black hover:bg-primary/90 rounded-2xl font-bold text-lg transition-all active:scale-95"
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="animate-spin h-5 w-5" /> : <>{t.nextStep} <ArrowRight className="ml-2 h-5 w-5" /></>}
                  </Button>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="plan-step"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center mb-8">
                  <h1 className="text-3xl font-bold text-white mb-2">{t.plansTitle}</h1>
                  <p className="text-white/40">{t.plansSubtitle}</p>
                </div>

                <div className="space-y-4">
                  {plans.map((plan) => (
                    <button
                      key={plan.id}
                      onClick={() => setSelectedPlan(plan.id)}
                      className={cn(
                        "w-full p-5 rounded-2xl border text-left transition-all relative overflow-hidden group",
                        selectedPlan === plan.id 
                          ? "bg-primary/[0.08] border-primary shadow-[0_0_20px_rgba(61,252,3,0.1)]" 
                          : "bg-white/5 border-white/10 hover:border-white/20"
                      )}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className={cn(
                          "font-bold text-lg",
                          selectedPlan === plan.id ? "text-primary" : "text-white"
                        )}>{plan.name}</span>
                        <span className="font-bold text-white">{plan.price}<span className="text-xs text-white/40 font-normal">{t.perMonth}</span></span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        {plan.features.map((f, i) => (
                          <div key={i} className="flex items-center gap-1.5 text-xs text-white/50">
                            <CheckCircle2 className="h-3 w-3 text-primary" />
                            {f}
                          </div>
                        ))}
                      </div>
                      {selectedPlan === plan.id && (
                        <motion.div 
                          layoutId="active-plan"
                          className="absolute inset-y-0 left-0 w-1 bg-primary" 
                        />
                      )}
                    </button>
                  ))}
                </div>

                <div className="flex gap-4 pt-4">
                  <Button 
                    variant="ghost" 
                    onClick={() => setStep("account")}
                    className="flex-1 h-14 border border-white/10 text-white rounded-2xl hover:bg-white/5 font-bold"
                  >
                    {t.back}
                  </Button>
                  <Button 
                    onClick={() => handleSubmit()}
                    className="flex-[2] h-14 bg-primary text-black hover:bg-primary/90 rounded-2xl font-bold text-lg transition-all active:scale-95"
                    disabled={loading || !selectedPlan}
                  >
                    {loading ? <Loader2 className="animate-spin h-5 w-5" /> : <>{t.subscribe} <ArrowRight className="ml-2 h-5 w-5" /></>}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="mt-8 text-center text-sm text-white/30">
            {step === "account" ? (
              <>{t.hasAccount} <Link to="/login" className="text-primary hover:underline">{t.login}</Link></>
            ) : (
              <>{t.secure} <strong>Stripe</strong></>
            )}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
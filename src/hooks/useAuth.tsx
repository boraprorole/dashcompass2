import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  isAdminGlobal: boolean;
  isAdminAgencia: boolean;
  agencyId: string | null;
  isTeam: boolean;
  isConexoes: boolean;
  loading: boolean;
  primaryColor: string;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminGlobal, setIsAdminGlobal] = useState(false);
  const [isAdminAgencia, setIsAdminAgencia] = useState(false);
  const [agencyId, setAgencyId] = useState<string | null>(null);
  const [isTeam, setIsTeam] = useState(false);
  const [isConexoes, setIsConexoes] = useState(false);
  const [loading, setLoading] = useState(true);
  const [primaryColor, setPrimaryColor] = useState("#3DFC03");
  const router = useRouter();
  const queryClient = useQueryClient();

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "primary_color")
        .maybeSingle();
      
      if (data?.value) {
        const color = typeof data.value === "string" ? data.value : JSON.stringify(data.value).replace(/"/g, "");
        setPrimaryColor(color);
        document.documentElement.style.setProperty("--primary", color);
        
        // Calcular e definir --primary-glow
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        const primaryGlow = `rgba(${r}, ${g}, ${b}, 0.4)`;
        document.documentElement.style.setProperty("--primary-glow", primaryGlow);
      } else {
        document.documentElement.style.setProperty("--primary", "#3DFC03");
        document.documentElement.style.setProperty("--primary-glow", "rgba(61, 252, 3, 0.4)");
      }
    } catch (err) {
      console.error("Erro ao carregar configurações:", err);
    }
  };

  const loadRoles = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role, agency_id")
      .eq("user_id", userId);
    
    const rolesArr = data ?? [];
    const roles = new Set(rolesArr.map((r) => r.role));
    
    const isGlobal = roles.has("admin_global");
    const isAgencia = roles.has("admin_agencia");
    const agency = rolesArr.find(r => r.agency_id)?.agency_id || null;

    setIsAdminGlobal(isGlobal);
    setIsAdminAgencia(isAgencia);
    setAgencyId(agency);
    setIsAdmin(roles.has("admin") || isGlobal || isAgencia);
    setIsTeam(roles.has("team") || roles.has("equipe") || isGlobal || isAgencia);
    setIsConexoes(roles.has("conexoes") || isGlobal);
  };

  useEffect(() => {
    loadSettings();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        setTimeout(() => loadRoles(newSession.user.id), 0);
      } else {
        setIsAdmin(false);
        setIsTeam(false);
        setIsConexoes(false);
      }
      router.invalidate();
      queryClient.invalidateQueries();
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        loadRoles(data.session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [router, queryClient]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      isAdmin, 
      isAdminGlobal,
      isAdminAgencia,
      agencyId,
      isTeam, 
      isConexoes, 
      loading, 
      primaryColor, 
      signOut 
    }}>
      {children}
    </AuthContext.Provider>
  );
}


export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

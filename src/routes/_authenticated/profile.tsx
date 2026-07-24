import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [{ title: "Perfil" }, { name: "description", content: "Gerencie seu perfil." }],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, isAdmin } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setDisplayName(data?.display_name ?? "");
        setAvatarUrl(data?.avatar_url ?? "");
        setLoading(false);
      });
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName.trim().slice(0, 80), avatar_url: avatarUrl.trim().slice(0, 500) || null })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error("Não foi possível salvar.");
      return;
    }
    toast.success("Perfil atualizado!");
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Seu perfil</h1>
        <p className="mt-1 text-sm text-muted-foreground">Atualize suas informações pessoais.</p>
      </header>

      <div className="glass-strong rounded-3xl p-8">
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-2xl font-semibold text-primary">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium">{user?.email}</p>
            <p className="text-xs text-muted-foreground">
              {isAdmin ? "Administrador" : "Usuário"}
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="display_name">Nome de exibição</Label>
            <Input
              id="display_name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={80}
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="avatar_url">URL do avatar</Label>
            <Input
              id="avatar_url"
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://..."
              maxLength={500}
              disabled={loading}
            />
          </div>
          <Button type="submit" disabled={saving || loading}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar alterações
          </Button>
        </form>
      </div>
    </div>
  );
}

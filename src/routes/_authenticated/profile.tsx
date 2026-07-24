import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Camera, User } from "lucide-react";
import imageCompression from "browser-image-compression";

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
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      .update({ 
        display_name: displayName.trim().slice(0, 80), 
        avatar_url: avatarUrl 
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error("Não foi possível salvar.");
      return;
    }
    toast.success("Perfil atualizado!");
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem.");
      return;
    }

    setUploading(true);
    try {
      let fileToUpload = file;

      // Processamento de imagem (se necessário)
      if (file.size > 1 * 1024 * 1024 || file.type !== "image/webp") {
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1024,
          useWebWorker: false,
          fileType: "image/webp",
          initialQuality: 0.85,
        };
        
        toast.info("Otimizando imagem...");
        try {
          const compressedFile = await imageCompression(file, options);
          // Criar um novo arquivo com o tipo correto caso o retorno seja apenas um Blob
          fileToUpload = new File([compressedFile], `avatar.${compressedFile.type.split('/')[1]}`, {
            type: compressedFile.type,
          });
        } catch (compressionError) {
          console.error("Erro na compressão:", compressionError);
          fileToUpload = file;
        }
      }

      const fileExt = fileToUpload.type.split("/")[1] || "webp";
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const filePath = fileName;

      console.log("Iniciando upload para:", filePath, "Tipo:", fileToUpload.type);

      const { error: uploadError } = await supabase.storage
        .from("profiles")
        .upload(filePath, fileToUpload, {
          contentType: fileToUpload.type,
          cacheControl: "3600",
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl);
      
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      toast.success("Foto de perfil atualizada!");
    } catch (error: any) {
      console.error("Erro detalhado no upload:", {
        message: error.message,
        error: error,
        stack: error.stack
      });
      toast.error(`Erro: ${error.message || "Erro ao processar imagem."}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Seu perfil</h1>
        <p className="mt-1 text-sm text-muted-foreground">Atualize suas informações pessoais.</p>
      </header>

      <div className="glass-strong rounded-3xl p-8">
        <div className="mb-8 flex flex-col items-center gap-6 md:flex-row md:items-start">
          <div className="relative group">
            <button
              onClick={handleAvatarClick}
              disabled={uploading}
              className="relative flex h-32 w-32 items-center justify-center overflow-hidden rounded-full bg-primary/15 transition-all hover:bg-primary/25 disabled:opacity-50"
              title="Mudar foto de perfil"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <div className="flex flex-col items-center text-primary">
                  {displayName ? (
                    <span className="text-4xl font-bold">{displayName[0].toUpperCase()}</span>
                  ) : (
                    <User className="h-12 w-12" />
                  )}
                </div>
              )}
              
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                {uploading ? (
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                ) : (
                  <Camera className="h-8 w-8 text-white" />
                )}
              </div>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
          </div>

          <div className="min-w-0 flex-1 pt-2 text-center md:text-left">
            <h2 className="text-xl font-bold">{displayName || user?.email?.split('@')[0]}</h2>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <div className="mt-2 flex justify-center md:justify-start">
              <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary uppercase tracking-wider">
                {isAdmin ? "Administrador" : "Usuário"}
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="display_name" className="text-xs uppercase tracking-widest text-muted-foreground">Nome de exibição</Label>
            <Input
              id="display_name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Seu nome completo"
              maxLength={80}
              disabled={loading}
              className="h-12 rounded-xl bg-background/50 border-border/50 focus:border-primary/50"
            />
          </div>
          
          <Button 
            type="submit" 
            disabled={saving || loading || uploading}
            className="w-full md:w-auto h-11 px-8 rounded-xl"
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar alterações
          </Button>
        </form>
      </div>
    </div>
  );
}

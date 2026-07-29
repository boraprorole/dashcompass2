-- Garante que a tabela existe e tem as permissões corretas
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tiktok_connections TO authenticated;
GRANT ALL ON public.tiktok_connections TO service_role;

-- Garante que o RLS está habilitado
ALTER TABLE public.tiktok_connections ENABLE ROW LEVEL SECURITY;

-- Cria ou atualiza a política para permitir que admins gerenciem as conexões
DROP POLICY IF EXISTS "Admins can manage tiktok_connections" ON public.tiktok_connections;
CREATE POLICY "Admins can manage tiktok_connections" 
ON public.tiktok_connections 
FOR ALL 
TO authenticated 
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'admin_global') OR 
  public.has_role(auth.uid(), 'admin_agencia')
);

-- Permite leitura pública para que os relatórios possam exibir os dados (se necessário)
DROP POLICY IF EXISTS "Public can read tiktok_connections" ON public.tiktok_connections;
CREATE POLICY "Public can read tiktok_connections"
ON public.tiktok_connections
FOR SELECT
TO anon, authenticated
USING (true);

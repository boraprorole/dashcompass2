-- Ensure RLS is enabled on storage.objects
-- (Ignoring ownership error if it fails, assuming it might already be enabled)
DO $$ 
BEGIN 
    EXECUTE 'ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY';
EXCEPTION WHEN OTHERS THEN 
    RAISE NOTICE 'Could not enable RLS, maybe already enabled or lack of permissions';
END $$;

-- Drop and recreate policies with simpler string matching
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete" ON storage.objects;

-- SELECT: Permite leitura pública no bucket avatars
CREATE POLICY "Public Access" ON storage.objects FOR SELECT 
USING (bucket_id = 'avatars');

-- INSERT: Permite upload se o primeiro segmento do nome for o UUID do usuário
CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT TO authenticated 
WITH CHECK (bucket_id = 'avatars' AND (split_part(name, '/', 1)) = auth.uid()::text);

-- UPDATE: Permite atualização no próprio diretório
CREATE POLICY "Authenticated Update" ON storage.objects FOR UPDATE TO authenticated 
USING (bucket_id = 'avatars' AND (split_part(name, '/', 1)) = auth.uid()::text);

-- DELETE: Permite exclusão no próprio diretório
CREATE POLICY "Authenticated Delete" ON storage.objects FOR DELETE TO authenticated 
USING (bucket_id = 'avatars' AND (split_part(name, '/', 1)) = auth.uid()::text);

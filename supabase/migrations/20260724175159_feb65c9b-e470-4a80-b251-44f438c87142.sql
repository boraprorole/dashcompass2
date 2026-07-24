-- Ensure RLS is active
DO $$ 
BEGIN 
    EXECUTE 'ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY';
EXCEPTION WHEN OTHERS THEN 
    NULL;
END $$;

-- Drop and recreate policies for 'profiles' bucket to ensure they are clean
DROP POLICY IF EXISTS "Profiles Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Profiles Authenticated Upload" ON storage.objects;
DROP POLICY IF EXISTS "Profiles Authenticated Update" ON storage.objects;
DROP POLICY IF EXISTS "Profiles Authenticated Delete" ON storage.objects;

-- SELECT: Permitir leitura (necessário para signed URLs e visualização direta)
CREATE POLICY "Profiles Public Access" ON storage.objects FOR SELECT 
USING (bucket_id = 'profiles');

-- INSERT: Upload restrito à pasta do próprio usuário
CREATE POLICY "Profiles Authenticated Upload" ON storage.objects FOR INSERT TO authenticated 
WITH CHECK (bucket_id = 'profiles' AND (split_part(name, '/', 1)) = auth.uid()::text);

-- UPDATE: Atualização restrita à pasta do próprio usuário
CREATE POLICY "Profiles Authenticated Update" ON storage.objects FOR UPDATE TO authenticated 
USING (bucket_id = 'profiles' AND (split_part(name, '/', 1)) = auth.uid()::text);

-- DELETE: Exclusão restrita à pasta do próprio usuário
CREATE POLICY "Profiles Authenticated Delete" ON storage.objects FOR DELETE TO authenticated 
USING (bucket_id = 'profiles' AND (split_part(name, '/', 1)) = auth.uid()::text);

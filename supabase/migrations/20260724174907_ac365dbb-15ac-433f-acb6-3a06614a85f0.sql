-- Re-apply policies for the new bucket 'profiles'
DROP POLICY IF EXISTS "Profiles Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Profiles Authenticated Upload" ON storage.objects;
DROP POLICY IF EXISTS "Profiles Authenticated Update" ON storage.objects;
DROP POLICY IF EXISTS "Profiles Authenticated Delete" ON storage.objects;

CREATE POLICY "Profiles Public Access" ON storage.objects FOR SELECT 
USING (bucket_id = 'profiles');

CREATE POLICY "Profiles Authenticated Upload" ON storage.objects FOR INSERT TO authenticated 
WITH CHECK (bucket_id = 'profiles' AND (split_part(name, '/', 1)) = auth.uid()::text);

CREATE POLICY "Profiles Authenticated Update" ON storage.objects FOR UPDATE TO authenticated 
USING (bucket_id = 'profiles' AND (split_part(name, '/', 1)) = auth.uid()::text);

CREATE POLICY "Profiles Authenticated Delete" ON storage.objects FOR DELETE TO authenticated 
USING (bucket_id = 'profiles' AND (split_part(name, '/', 1)) = auth.uid()::text);

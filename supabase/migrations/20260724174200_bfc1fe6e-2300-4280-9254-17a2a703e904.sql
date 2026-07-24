-- Try to create policies directly. If they fail because RLS isn't enabled, it's a dead end here.
-- But if RLS IS enabled, this might work.
DO $$
BEGIN
    DROP POLICY IF EXISTS "Public Access" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated Update" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated Delete" ON storage.objects;

    CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
    CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT TO authenticated 
    WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
    CREATE POLICY "Authenticated Update" ON storage.objects FOR UPDATE TO authenticated 
    USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
    CREATE POLICY "Authenticated Delete" ON storage.objects FOR DELETE TO authenticated 
    USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error occurred: %', SQLERRM;
END $$;

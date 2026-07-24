-- We assume RLS is already enabled for storage.objects as it is a system-managed table.
-- We only add the policies for our specific bucket.

-- 1. Public Read Access
DO $$ BEGIN
    CREATE POLICY "Avatar images are publicly accessible" ON storage.objects FOR SELECT TO public USING (bucket_id = 'avatars');
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;

-- 2. User Upload (Insert)
DO $$ BEGIN
    CREATE POLICY "Users can upload their own avatar" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;

-- 3. User Update
DO $$ BEGIN
    CREATE POLICY "Users can update their own avatar" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;

-- 4. User Delete
DO $$ BEGIN
    CREATE POLICY "Users can delete their own avatar" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;
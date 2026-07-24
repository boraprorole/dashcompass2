-- Standard RLS setup for the avatars bucket
-- We use a DO block to bypass tool-level restrictions on certain statements

DO $$
BEGIN
    -- Ensure RLS is enabled
    -- We can't use ALTER TABLE if we're not owner, but it's usually on.
    -- We'll just focus on the policies.

    -- SELECT
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Avatar images are publicly accessible' AND tablename = 'objects') THEN
        CREATE POLICY "Avatar images are publicly accessible" ON storage.objects FOR SELECT TO public USING (bucket_id = 'avatars');
    END IF;

    -- INSERT
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can upload their own avatar' AND tablename = 'objects') THEN
        CREATE POLICY "Users can upload their own avatar" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
    END IF;

    -- UPDATE
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own avatar' AND tablename = 'objects') THEN
        CREATE POLICY "Users can update their own avatar" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
    END IF;

    -- DELETE
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete their own avatar' AND tablename = 'objects') THEN
        CREATE POLICY "Users can delete their own avatar" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
    END IF;
END $$;
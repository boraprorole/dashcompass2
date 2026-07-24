-- Grant select on app_settings to anon so it can be read without login
GRANT SELECT ON public.app_settings TO anon;

-- Ensure RLS policy exists for public read
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'app_settings' AND policyname = 'Public can read settings'
    ) THEN
        CREATE POLICY "Public can read settings" ON public.app_settings
        FOR SELECT TO anon, authenticated
        USING (true);
    END IF;
END
$$;
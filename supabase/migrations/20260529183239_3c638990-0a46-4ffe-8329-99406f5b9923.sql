-- Add logo_url column to reports
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Create public storage bucket for report logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('report-logos', 'report-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: public read, admin-only write/update/delete
CREATE POLICY "Public read report logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'report-logos');

CREATE POLICY "Admins upload report logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'report-logos' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins update report logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'report-logos' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins delete report logos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'report-logos' AND public.has_role(auth.uid(), 'admin'::public.app_role));
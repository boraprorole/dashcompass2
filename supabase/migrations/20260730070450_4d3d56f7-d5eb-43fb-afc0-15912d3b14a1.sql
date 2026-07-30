CREATE POLICY "company_logos_read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'company-logos');
CREATE POLICY "company_logos_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'company-logos');
CREATE POLICY "company_logos_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'company-logos') WITH CHECK (bucket_id = 'company-logos');
CREATE POLICY "company_logos_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'company-logos');
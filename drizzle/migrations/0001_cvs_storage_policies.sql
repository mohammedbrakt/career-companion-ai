CREATE POLICY "users read own cv files" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'cvs' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "users upload own cv files" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'cvs' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "users update own cv files" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'cvs' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "users delete own cv files" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'cvs' AND (storage.foldername(name))[1] = auth.uid()::text);
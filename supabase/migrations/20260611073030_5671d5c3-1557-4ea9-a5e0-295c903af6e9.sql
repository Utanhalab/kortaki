
-- Storage RLS for "portfolios" bucket
-- Path pattern: {barber_id}/{photo_id}.ext

CREATE POLICY "Portfolio photos are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'portfolios');

CREATE POLICY "Barbers can upload to their own folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'portfolios'
    AND public.can_manage_barber(auth.uid(), (storage.foldername(name))[1]::uuid)
  );

CREATE POLICY "Barbers can update their own portfolio files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'portfolios'
    AND public.can_manage_barber(auth.uid(), (storage.foldername(name))[1]::uuid)
  );

CREATE POLICY "Barbers can delete their own portfolio files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'portfolios'
    AND public.can_manage_barber(auth.uid(), (storage.foldername(name))[1]::uuid)
  );

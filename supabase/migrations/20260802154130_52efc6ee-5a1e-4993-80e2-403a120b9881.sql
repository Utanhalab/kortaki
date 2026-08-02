DROP VIEW IF EXISTS public.barber_reviews_public;

DROP POLICY IF EXISTS "Authors and barber managers can view full reviews" ON public.barber_reviews;

CREATE POLICY "Anyone can view reviews"
ON public.barber_reviews
FOR SELECT
TO anon, authenticated
USING (true);

REVOKE ALL ON public.barber_reviews FROM anon;
REVOKE ALL ON public.barber_reviews FROM authenticated;

GRANT SELECT (id, barber_id, customer_name, rating, comment, photo_url, service_name, barber_reply, replied_at, created_at)
  ON public.barber_reviews TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.barber_reviews TO authenticated;
GRANT ALL ON public.barber_reviews TO service_role;
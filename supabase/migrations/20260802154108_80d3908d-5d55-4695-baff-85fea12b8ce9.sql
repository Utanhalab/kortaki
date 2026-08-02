-- 1) barber_reviews: stop exposing user_id publicly
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.barber_reviews;

CREATE POLICY "Authors and barber managers can view full reviews"
ON public.barber_reviews
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR private.can_manage_barber(auth.uid(), barber_id));

REVOKE ALL ON public.barber_reviews FROM anon;
REVOKE ALL ON public.barber_reviews FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.barber_reviews TO authenticated;
GRANT ALL ON public.barber_reviews TO service_role;

CREATE OR REPLACE VIEW public.barber_reviews_public
WITH (security_invoker = false) AS
SELECT id, barber_id, customer_name, rating, comment, photo_url,
       service_name, barber_reply, replied_at, created_at
FROM public.barber_reviews;

GRANT SELECT ON public.barber_reviews_public TO anon, authenticated;
GRANT ALL ON public.barber_reviews_public TO service_role;

-- 2) remove unnecessary SECURITY DEFINER execute grant
REVOKE EXECUTE ON FUNCTION public.is_platform_admin() FROM authenticated, anon, PUBLIC;
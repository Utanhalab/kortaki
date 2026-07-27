
-- 1. Private schema + helpers
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO postgres, service_role;

CREATE OR REPLACE FUNCTION private.is_shop_owner(_user_id uuid, _shop_id integer)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.shop_owners WHERE user_id = _user_id AND shop_id = _shop_id); $$;

CREATE OR REPLACE FUNCTION private.can_manage_barber(_user_id uuid, _barber_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.barbers b
    WHERE b.id = _barber_id
      AND (b.user_id = _user_id OR private.is_shop_owner(_user_id, b.shop_id))
  );
$$;

-- 2. queue_entries: replace open policies
DROP POLICY IF EXISTS "Anyone can read queue entries" ON public.queue_entries;
DROP POLICY IF EXISTS "Anyone can insert queue entries" ON public.queue_entries;
DROP POLICY IF EXISTS "Anyone can update queue entries" ON public.queue_entries;
DROP POLICY IF EXISTS "Anyone can delete queue entries" ON public.queue_entries;
DROP POLICY IF EXISTS "Users read own entries or shop owners read all" ON public.queue_entries;
DROP POLICY IF EXISTS "Users insert own queue entries" ON public.queue_entries;
DROP POLICY IF EXISTS "Users update own entries or shop owners" ON public.queue_entries;
DROP POLICY IF EXISTS "Users delete own entries or shop owners" ON public.queue_entries;

CREATE POLICY "Users read own entries or shop owners read all"
  ON public.queue_entries FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR private.is_shop_owner(auth.uid(), shop_id));
CREATE POLICY "Users insert own queue entries"
  ON public.queue_entries FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own entries or shop owners"
  ON public.queue_entries FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR private.is_shop_owner(auth.uid(), shop_id))
  WITH CHECK (auth.uid() = user_id OR private.is_shop_owner(auth.uid(), shop_id));
CREATE POLICY "Users delete own entries or shop owners"
  ON public.queue_entries FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR private.is_shop_owner(auth.uid(), shop_id));

-- 3. queue_activity
DROP POLICY IF EXISTS "Anyone can insert activity" ON public.queue_activity;
DROP POLICY IF EXISTS "Owners or active queue members insert activity" ON public.queue_activity;
CREATE POLICY "Owners or active queue members insert activity"
  ON public.queue_activity FOR INSERT TO authenticated
  WITH CHECK (
    private.is_shop_owner(auth.uid(), shop_id)
    OR EXISTS (
      SELECT 1 FROM public.queue_entries qe
      WHERE qe.shop_id = queue_activity.shop_id
        AND qe.user_id = auth.uid()
        AND qe.status IN ('waiting','called','serving')
    )
  );

-- 4. queue_settings
DROP POLICY IF EXISTS "Anyone can update queue settings" ON public.queue_settings;
DROP POLICY IF EXISTS "Anyone can upsert queue settings" ON public.queue_settings;
DROP POLICY IF EXISTS "Shop owners update queue settings" ON public.queue_settings;
DROP POLICY IF EXISTS "Shop owners insert queue settings" ON public.queue_settings;
CREATE POLICY "Shop owners update queue settings"
  ON public.queue_settings FOR UPDATE TO authenticated
  USING (private.is_shop_owner(auth.uid(), shop_id))
  WITH CHECK (private.is_shop_owner(auth.uid(), shop_id));
CREATE POLICY "Shop owners insert queue settings"
  ON public.queue_settings FOR INSERT TO authenticated
  WITH CHECK (private.is_shop_owner(auth.uid(), shop_id));

-- 5. Repoint every other policy that referenced the public helpers
DROP POLICY IF EXISTS "Bookings: customer or owner read" ON public.bookings;
DROP POLICY IF EXISTS "Bookings: customer or owner update" ON public.bookings;
CREATE POLICY "Bookings: customer or owner read" ON public.bookings FOR SELECT TO authenticated
  USING ((auth.uid() = user_id) OR private.is_shop_owner(auth.uid(), shop_id));
CREATE POLICY "Bookings: customer or owner update" ON public.bookings FOR UPDATE TO authenticated
  USING ((auth.uid() = user_id) OR private.is_shop_owner(auth.uid(), shop_id))
  WITH CHECK ((auth.uid() = user_id) OR private.is_shop_owner(auth.uid(), shop_id));

DROP POLICY IF EXISTS "Promos: owner read" ON public.promotion_sends;
DROP POLICY IF EXISTS "Promos: owner insert" ON public.promotion_sends;
CREATE POLICY "Promos: owner read" ON public.promotion_sends FOR SELECT TO authenticated
  USING (private.is_shop_owner(auth.uid(), shop_id));
CREATE POLICY "Promos: owner insert" ON public.promotion_sends FOR INSERT TO authenticated
  WITH CHECK ((auth.uid() = sent_by) AND private.is_shop_owner(auth.uid(), shop_id));

DROP POLICY IF EXISTS "Anyone can view active barbers" ON public.barbers;
DROP POLICY IF EXISTS "Shop owner can insert barbers" ON public.barbers;
DROP POLICY IF EXISTS "Barber or shop owner can update" ON public.barbers;
DROP POLICY IF EXISTS "Shop owner can delete barbers" ON public.barbers;
CREATE POLICY "Anyone can view active barbers" ON public.barbers FOR SELECT
  USING ((is_active = true) OR (user_id = auth.uid()) OR private.is_shop_owner(auth.uid(), shop_id));
CREATE POLICY "Shop owner can insert barbers" ON public.barbers FOR INSERT TO authenticated
  WITH CHECK (private.is_shop_owner(auth.uid(), shop_id));
CREATE POLICY "Barber or shop owner can update" ON public.barbers FOR UPDATE TO authenticated
  USING ((user_id = auth.uid()) OR private.is_shop_owner(auth.uid(), shop_id))
  WITH CHECK ((user_id = auth.uid()) OR private.is_shop_owner(auth.uid(), shop_id));
CREATE POLICY "Shop owner can delete barbers" ON public.barbers FOR DELETE TO authenticated
  USING (private.is_shop_owner(auth.uid(), shop_id));

DROP POLICY IF EXISTS "Barber manages own hours" ON public.barber_hours;
DROP POLICY IF EXISTS "Barber manages own services" ON public.barber_services;
DROP POLICY IF EXISTS "Barber manages own portfolio" ON public.portfolio_photos;
CREATE POLICY "Barber manages own hours" ON public.barber_hours FOR ALL TO authenticated
  USING (private.can_manage_barber(auth.uid(), barber_id))
  WITH CHECK (private.can_manage_barber(auth.uid(), barber_id));
CREATE POLICY "Barber manages own services" ON public.barber_services FOR ALL TO authenticated
  USING (private.can_manage_barber(auth.uid(), barber_id))
  WITH CHECK (private.can_manage_barber(auth.uid(), barber_id));
CREATE POLICY "Barber manages own portfolio" ON public.portfolio_photos FOR ALL TO authenticated
  USING (private.can_manage_barber(auth.uid(), barber_id))
  WITH CHECK (private.can_manage_barber(auth.uid(), barber_id));

DROP POLICY IF EXISTS "Author can edit own review, barber can reply" ON public.barber_reviews;
CREATE POLICY "Author can edit own review, barber can reply" ON public.barber_reviews FOR UPDATE TO authenticated
  USING ((user_id = auth.uid()) OR private.can_manage_barber(auth.uid(), barber_id))
  WITH CHECK ((user_id = auth.uid()) OR private.can_manage_barber(auth.uid(), barber_id));

DROP POLICY IF EXISTS "Public photos viewable by everyone" ON public.style_photos;
DROP POLICY IF EXISTS "Barbers can insert their own photos" ON public.style_photos;
DROP POLICY IF EXISTS "Barbers can update their own photos" ON public.style_photos;
DROP POLICY IF EXISTS "Barbers can delete their own photos" ON public.style_photos;
CREATE POLICY "Public photos viewable by everyone" ON public.style_photos FOR SELECT
  USING ((is_public = true) OR private.can_manage_barber(auth.uid(), barber_id));
CREATE POLICY "Barbers can insert their own photos" ON public.style_photos FOR INSERT TO authenticated
  WITH CHECK (private.can_manage_barber(auth.uid(), barber_id));
CREATE POLICY "Barbers can update their own photos" ON public.style_photos FOR UPDATE TO authenticated
  USING (private.can_manage_barber(auth.uid(), barber_id))
  WITH CHECK (private.can_manage_barber(auth.uid(), barber_id));
CREATE POLICY "Barbers can delete their own photos" ON public.style_photos FOR DELETE TO authenticated
  USING (private.can_manage_barber(auth.uid(), barber_id));

DROP POLICY IF EXISTS "Barbers can upload to their own folder" ON storage.objects;
DROP POLICY IF EXISTS "Barbers can update their own portfolio files" ON storage.objects;
DROP POLICY IF EXISTS "Barbers can delete their own portfolio files" ON storage.objects;
CREATE POLICY "Barbers can upload to their own folder" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'portfolios' AND private.can_manage_barber(auth.uid(), ((storage.foldername(name))[1])::uuid));
CREATE POLICY "Barbers can update their own portfolio files" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'portfolios' AND private.can_manage_barber(auth.uid(), ((storage.foldername(name))[1])::uuid));
CREATE POLICY "Barbers can delete their own portfolio files" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'portfolios' AND private.can_manage_barber(auth.uid(), ((storage.foldername(name))[1])::uuid));

-- 6. Now drop the public wrappers
DROP FUNCTION IF EXISTS public.is_shop_owner(uuid, integer);
DROP FUNCTION IF EXISTS public.can_manage_barber(uuid, uuid);

-- 7. Lock down remaining SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recompute_barber_rating() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_style_save_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_view_count(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.increment_booking_count(uuid) FROM PUBLIC, anon;

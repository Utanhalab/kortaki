
-- queue_entries: replace permissive policies
DROP POLICY IF EXISTS "Anyone can read queue entries" ON public.queue_entries;
DROP POLICY IF EXISTS "Anyone can insert queue entries" ON public.queue_entries;
DROP POLICY IF EXISTS "Anyone can update queue entries" ON public.queue_entries;
DROP POLICY IF EXISTS "Anyone can delete queue entries" ON public.queue_entries;

CREATE POLICY "Users read own entries or shop owners read all"
  ON public.queue_entries FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_shop_owner(auth.uid(), shop_id));

CREATE POLICY "Users insert own queue entries"
  ON public.queue_entries FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own entries or shop owners"
  ON public.queue_entries FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_shop_owner(auth.uid(), shop_id))
  WITH CHECK (auth.uid() = user_id OR public.is_shop_owner(auth.uid(), shop_id));

CREATE POLICY "Users delete own entries or shop owners"
  ON public.queue_entries FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.is_shop_owner(auth.uid(), shop_id));

-- queue_activity: keep public SELECT, restrict INSERT
DROP POLICY IF EXISTS "Anyone can insert activity" ON public.queue_activity;

CREATE POLICY "Owners or active queue members insert activity"
  ON public.queue_activity FOR INSERT TO authenticated
  WITH CHECK (
    public.is_shop_owner(auth.uid(), shop_id)
    OR EXISTS (
      SELECT 1 FROM public.queue_entries qe
      WHERE qe.shop_id = queue_activity.shop_id
        AND qe.user_id = auth.uid()
        AND qe.status IN ('waiting','called','serving')
    )
  );

-- queue_settings: keep public SELECT, restrict writes to shop owners
DROP POLICY IF EXISTS "Anyone can update queue settings" ON public.queue_settings;
DROP POLICY IF EXISTS "Anyone can upsert queue settings" ON public.queue_settings;

CREATE POLICY "Shop owners update queue settings"
  ON public.queue_settings FOR UPDATE TO authenticated
  USING (public.is_shop_owner(auth.uid(), shop_id))
  WITH CHECK (public.is_shop_owner(auth.uid(), shop_id));

CREATE POLICY "Shop owners insert queue settings"
  ON public.queue_settings FOR INSERT TO authenticated
  WITH CHECK (public.is_shop_owner(auth.uid(), shop_id));

-- Revoke direct EXECUTE from anon on SECURITY DEFINER functions.
-- Trigger-only functions get EXECUTE revoked from authenticated too.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recompute_barber_rating() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_style_save_count() FROM PUBLIC, anon, authenticated;

-- Client-callable RPCs: allow only signed-in users
REVOKE EXECUTE ON FUNCTION public.increment_view_count(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.increment_booking_count(uuid) FROM PUBLIC, anon;

-- Helpers referenced by RLS policies: keep authenticated (needed by policies), revoke anon
REVOKE EXECUTE ON FUNCTION public.is_shop_owner(uuid, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_manage_barber(uuid, uuid) FROM PUBLIC, anon;

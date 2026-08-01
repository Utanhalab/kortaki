-- 1) Privilege escalation: remove self-insert on shop_owners
DROP POLICY IF EXISTS "Owners: self insert" ON public.shop_owners;

CREATE POLICY "Admins can assign shop owners"
ON public.shop_owners FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2) SECURITY DEFINER functions: revoke from anon/public, restrict helpers
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.recompute_barber_rating() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_style_save_count() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.create_booking(integer, text, text, text, timestamptz, integer, integer, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_booking(integer, text, text, text, timestamptz, integer, integer, uuid, text) TO authenticated;

REVOKE ALL ON FUNCTION public.shop_busy_ranges(integer, timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.shop_busy_ranges(integer, timestamptz, timestamptz) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_assign_shop_owner(text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_assign_shop_owner(text, integer) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_list_shop_owners() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_shop_owners() TO authenticated;

-- 3) shop_busy_ranges must require a signed-in caller (it bypasses RLS)
CREATE OR REPLACE FUNCTION public.shop_busy_ranges(_shop_id integer, _from timestamptz, _to timestamptz)
RETURNS TABLE(starts_at timestamptz, ends_at timestamptz, barber_name text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'auth required' USING ERRCODE = '28000';
  END IF;
  RETURN QUERY
    SELECT b.appointment_at,
           b.appointment_at + make_interval(mins => b.duration_minutes),
           b.barber_name
    FROM public.bookings b
    WHERE b.shop_id = _shop_id
      AND b.status <> 'cancelled'
      AND b.appointment_at < _to
      AND b.appointment_at + make_interval(mins => b.duration_minutes) > _from;
END;
$$;

REVOKE ALL ON FUNCTION public.shop_busy_ranges(integer, timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.shop_busy_ranges(integer, timestamptz, timestamptz) TO authenticated;
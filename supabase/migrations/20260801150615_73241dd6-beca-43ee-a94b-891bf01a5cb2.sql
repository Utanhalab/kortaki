REVOKE ALL ON FUNCTION public.increment_view_count(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.increment_booking_count(uuid) FROM PUBLIC, anon, authenticated;
ALTER FUNCTION public.increment_view_count(uuid) SET search_path = public;
ALTER FUNCTION public.increment_booking_count(uuid) SET search_path = public;
ALTER FUNCTION public.increment_view_count(uuid) SET schema private;
ALTER FUNCTION public.increment_booking_count(uuid) SET schema private;
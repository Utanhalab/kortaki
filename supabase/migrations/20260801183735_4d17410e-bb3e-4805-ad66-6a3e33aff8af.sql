ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS duration_minutes integer NOT NULL DEFAULT 30;

CREATE OR REPLACE FUNCTION public.shop_busy_ranges(_shop_id integer, _from timestamptz, _to timestamptz)
RETURNS TABLE(starts_at timestamptz, ends_at timestamptz, barber_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.appointment_at,
         b.appointment_at + make_interval(mins => b.duration_minutes),
         b.barber_name
  FROM public.bookings b
  WHERE b.shop_id = _shop_id
    AND b.status <> 'cancelled'
    AND b.appointment_at < _to
    AND b.appointment_at + make_interval(mins => b.duration_minutes) > _from;
$$;

REVOKE ALL ON FUNCTION public.shop_busy_ranges(integer, timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.shop_busy_ranges(integer, timestamptz, timestamptz) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.create_booking(
  _shop_id integer,
  _shop_name text,
  _service_name text,
  _barber_name text,
  _appointment_at timestamptz,
  _duration_minutes integer,
  _price integer,
  _style_photo_id uuid DEFAULT NULL,
  _style_reference_url text DEFAULT NULL
)
RETURNS public.bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _end timestamptz := _appointment_at + make_interval(mins => COALESCE(_duration_minutes, 30));
  _row public.bookings;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'auth required' USING ERRCODE = '28000';
  END IF;
  IF COALESCE(_duration_minutes, 30) <= 0 THEN
    RAISE EXCEPTION 'invalid duration';
  END IF;

  PERFORM pg_advisory_xact_lock(_shop_id);

  IF EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.shop_id = _shop_id
      AND b.status <> 'cancelled'
      AND b.appointment_at < _end
      AND b.appointment_at + make_interval(mins => b.duration_minutes) > _appointment_at
      AND (
        b.barber_name IS NOT DISTINCT FROM _barber_name
        OR b.barber_name IS NULL OR _barber_name IS NULL
        OR b.barber_name = 'Qualquer disponível' OR _barber_name = 'Qualquer disponível'
      )
  ) THEN
    RAISE EXCEPTION 'slot_taken' USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.bookings (user_id, shop_id, shop_name, service_name, barber_name, appointment_at, duration_minutes, price, status, style_photo_id, style_reference_url)
  VALUES (_uid, _shop_id, _shop_name, _service_name, _barber_name, _appointment_at, COALESCE(_duration_minutes, 30), _price, 'upcoming', _style_photo_id, _style_reference_url)
  RETURNING * INTO _row;

  RETURN _row;
END;
$$;

REVOKE ALL ON FUNCTION public.create_booking(integer, text, text, text, timestamptz, integer, integer, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_booking(integer, text, text, text, timestamptz, integer, integer, uuid, text) TO authenticated, service_role;

-- =========================================================
-- Barbers
-- =========================================================
CREATE TABLE public.barbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id integer NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  tagline text,
  bio text,
  avatar_url text,
  experience_years integer NOT NULL DEFAULT 1,
  languages text[] NOT NULL DEFAULT ARRAY['Português']::text[],
  specialties text[] NOT NULL DEFAULT '{}'::text[],
  is_verified boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  total_cuts integer NOT NULL DEFAULT 0,
  rating_avg numeric(3,2) NOT NULL DEFAULT 0,
  rating_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX barbers_shop_id_idx ON public.barbers(shop_id);
CREATE INDEX barbers_user_id_idx ON public.barbers(user_id);

GRANT SELECT ON public.barbers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.barbers TO authenticated;
GRANT ALL ON public.barbers TO service_role;

ALTER TABLE public.barbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active barbers"
  ON public.barbers FOR SELECT
  USING (is_active = true OR user_id = auth.uid() OR public.is_shop_owner(auth.uid(), shop_id));

CREATE POLICY "Shop owner can insert barbers"
  ON public.barbers FOR INSERT TO authenticated
  WITH CHECK (public.is_shop_owner(auth.uid(), shop_id));

CREATE POLICY "Barber or shop owner can update"
  ON public.barbers FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_shop_owner(auth.uid(), shop_id))
  WITH CHECK (user_id = auth.uid() OR public.is_shop_owner(auth.uid(), shop_id));

CREATE POLICY "Shop owner can delete barbers"
  ON public.barbers FOR DELETE TO authenticated
  USING (public.is_shop_owner(auth.uid(), shop_id));

CREATE TRIGGER barbers_updated_at
  BEFORE UPDATE ON public.barbers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helper: can manage barber
CREATE OR REPLACE FUNCTION public.can_manage_barber(_user_id uuid, _barber_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.barbers b
    WHERE b.id = _barber_id
      AND (b.user_id = _user_id OR public.is_shop_owner(_user_id, b.shop_id))
  );
$$;

-- =========================================================
-- Working hours
-- =========================================================
CREATE TABLE public.barber_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id uuid NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  is_working boolean NOT NULL DEFAULT true,
  start_time time NOT NULL DEFAULT '09:00',
  end_time time NOT NULL DEFAULT '20:00',
  break_start time,
  break_end time,
  UNIQUE(barber_id, day_of_week)
);

GRANT SELECT ON public.barber_hours TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.barber_hours TO authenticated;
GRANT ALL ON public.barber_hours TO service_role;

ALTER TABLE public.barber_hours ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view barber hours"
  ON public.barber_hours FOR SELECT USING (true);
CREATE POLICY "Barber manages own hours"
  ON public.barber_hours FOR ALL TO authenticated
  USING (public.can_manage_barber(auth.uid(), barber_id))
  WITH CHECK (public.can_manage_barber(auth.uid(), barber_id));

-- =========================================================
-- Barber services
-- =========================================================
CREATE TABLE public.barber_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id uuid NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  service_id text NOT NULL,
  custom_duration_minutes integer,
  is_available boolean NOT NULL DEFAULT true,
  UNIQUE(barber_id, service_id)
);

GRANT SELECT ON public.barber_services TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.barber_services TO authenticated;
GRANT ALL ON public.barber_services TO service_role;

ALTER TABLE public.barber_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view barber services"
  ON public.barber_services FOR SELECT USING (true);
CREATE POLICY "Barber manages own services"
  ON public.barber_services FOR ALL TO authenticated
  USING (public.can_manage_barber(auth.uid(), barber_id))
  WITH CHECK (public.can_manage_barber(auth.uid(), barber_id));

-- =========================================================
-- Portfolio
-- =========================================================
CREATE TABLE public.portfolio_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id uuid NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  public_url text NOT NULL,
  style_label text,
  description text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX portfolio_photos_barber_idx ON public.portfolio_photos(barber_id, position);

GRANT SELECT ON public.portfolio_photos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolio_photos TO authenticated;
GRANT ALL ON public.portfolio_photos TO service_role;

ALTER TABLE public.portfolio_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view portfolio"
  ON public.portfolio_photos FOR SELECT USING (true);
CREATE POLICY "Barber manages own portfolio"
  ON public.portfolio_photos FOR ALL TO authenticated
  USING (public.can_manage_barber(auth.uid(), barber_id))
  WITH CHECK (public.can_manage_barber(auth.uid(), barber_id));

-- =========================================================
-- Reviews
-- =========================================================
CREATE TABLE public.barber_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id uuid NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  booking_id uuid,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  photo_url text,
  service_name text,
  barber_reply text,
  replied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(booking_id)
);
CREATE INDEX barber_reviews_barber_idx ON public.barber_reviews(barber_id, created_at DESC);

GRANT SELECT ON public.barber_reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.barber_reviews TO authenticated;
GRANT ALL ON public.barber_reviews TO service_role;

ALTER TABLE public.barber_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reviews"
  ON public.barber_reviews FOR SELECT USING (true);

CREATE POLICY "Logged-in customers can submit reviews"
  ON public.barber_reviews FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Author can edit own review, barber can reply"
  ON public.barber_reviews FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.can_manage_barber(auth.uid(), barber_id))
  WITH CHECK (user_id = auth.uid() OR public.can_manage_barber(auth.uid(), barber_id));

CREATE POLICY "Author can delete own review"
  ON public.barber_reviews FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Recompute aggregates on review changes
CREATE OR REPLACE FUNCTION public.recompute_barber_rating()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _barber_id uuid := COALESCE(NEW.barber_id, OLD.barber_id);
  _avg numeric;
  _count integer;
BEGIN
  SELECT COALESCE(AVG(rating)::numeric(3,2), 0), COUNT(*)
    INTO _avg, _count
  FROM public.barber_reviews
  WHERE barber_id = _barber_id;

  UPDATE public.barbers
    SET rating_avg = _avg,
        rating_count = _count,
        is_verified = (_count >= 20)
    WHERE id = _barber_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER barber_reviews_aggregate
AFTER INSERT OR UPDATE OR DELETE ON public.barber_reviews
FOR EACH ROW EXECUTE FUNCTION public.recompute_barber_rating();

-- =========================================================
-- Saved barbers (favourites)
-- =========================================================
CREATE TABLE public.saved_barbers (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  barber_id uuid NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  saved_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, barber_id)
);

GRANT SELECT, INSERT, DELETE ON public.saved_barbers TO authenticated;
GRANT ALL ON public.saved_barbers TO service_role;

ALTER TABLE public.saved_barbers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own saved barbers"
  ON public.saved_barbers FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

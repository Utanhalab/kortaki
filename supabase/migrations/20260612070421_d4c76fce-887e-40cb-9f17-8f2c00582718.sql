
-- =========================================================
-- STYLE CATEGORIES
-- =========================================================
CREATE TABLE public.style_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name_pt text NOT NULL,
  icon text,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.style_categories TO anon, authenticated;
GRANT ALL ON public.style_categories TO service_role;

ALTER TABLE public.style_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categories are viewable by everyone"
  ON public.style_categories FOR SELECT
  USING (true);

INSERT INTO public.style_categories (slug, name_pt, icon, position) VALUES
  ('trending',   'Em Alta',    '🔥', 0),
  ('fade',       'Fade',       '✂️', 1),
  ('afro',       'Afro',       '💇', 2),
  ('trancas',    'Tranças',    '🪮', 3),
  ('dreadlocks', 'Dreadlocks', '🌀', 4),
  ('barba',      'Barba',      '🧔', 5),
  ('degrade',    'Degradê',    '💈', 6),
  ('infantil',   'Infantil',   '👦', 7),
  ('design',     'Design',     '🎨', 8);

-- =========================================================
-- STYLE PHOTOS
-- =========================================================
CREATE TABLE public.style_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id uuid NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  shop_id integer NOT NULL,
  category_id uuid REFERENCES public.style_categories(id) ON DELETE SET NULL,
  service_id text,
  storage_path text NOT NULL,
  public_url text NOT NULL,
  style_name text NOT NULL,
  description text,
  tags text[] NOT NULL DEFAULT '{}',
  is_public boolean NOT NULL DEFAULT true,
  is_featured boolean NOT NULL DEFAULT false,
  view_count int NOT NULL DEFAULT 0,
  save_count int NOT NULL DEFAULT 0,
  booking_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.style_photos TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.style_photos TO authenticated;
GRANT ALL ON public.style_photos TO service_role;

ALTER TABLE public.style_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public photos viewable by everyone"
  ON public.style_photos FOR SELECT
  USING (is_public = true OR public.can_manage_barber(auth.uid(), barber_id));

CREATE POLICY "Barbers can insert their own photos"
  ON public.style_photos FOR INSERT
  TO authenticated
  WITH CHECK (public.can_manage_barber(auth.uid(), barber_id));

CREATE POLICY "Barbers can update their own photos"
  ON public.style_photos FOR UPDATE
  TO authenticated
  USING (public.can_manage_barber(auth.uid(), barber_id))
  WITH CHECK (public.can_manage_barber(auth.uid(), barber_id));

CREATE POLICY "Barbers can delete their own photos"
  ON public.style_photos FOR DELETE
  TO authenticated
  USING (public.can_manage_barber(auth.uid(), barber_id));

CREATE INDEX style_photos_category_idx  ON public.style_photos(category_id);
CREATE INDEX style_photos_barber_idx    ON public.style_photos(barber_id);
CREATE INDEX style_photos_shop_idx      ON public.style_photos(shop_id);
CREATE INDEX style_photos_public_created_idx
  ON public.style_photos(is_public, created_at DESC);

CREATE TRIGGER style_photos_updated_at
  BEFORE UPDATE ON public.style_photos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- SAVED STYLES (wishlist)
-- =========================================================
CREATE TABLE public.saved_styles (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  style_photo_id uuid NOT NULL REFERENCES public.style_photos(id) ON DELETE CASCADE,
  saved_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, style_photo_id)
);

GRANT SELECT, INSERT, DELETE ON public.saved_styles TO authenticated;
GRANT ALL ON public.saved_styles TO service_role;

ALTER TABLE public.saved_styles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own saved styles"
  ON public.saved_styles FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX saved_styles_user_idx ON public.saved_styles(user_id);

-- =========================================================
-- STYLE TRENDING
-- =========================================================
CREATE TABLE public.style_trending (
  style_photo_id uuid PRIMARY KEY REFERENCES public.style_photos(id) ON DELETE CASCADE,
  weekly_bookings int NOT NULL DEFAULT 0,
  weekly_saves int NOT NULL DEFAULT 0,
  weekly_views int NOT NULL DEFAULT 0,
  trending_score numeric GENERATED ALWAYS AS
    (weekly_bookings * 3 + weekly_saves * 2 + weekly_views * 0.1) STORED,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.style_trending TO anon, authenticated;
GRANT ALL ON public.style_trending TO service_role;

ALTER TABLE public.style_trending ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trending viewable by everyone"
  ON public.style_trending FOR SELECT
  USING (true);

CREATE INDEX style_trending_score_idx
  ON public.style_trending(trending_score DESC);

-- =========================================================
-- SEARCH HISTORY
-- =========================================================
CREATE TABLE public.search_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query text NOT NULL,
  searched_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.search_history TO authenticated;
GRANT ALL ON public.search_history TO service_role;

ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own search history"
  ON public.search_history FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX search_history_user_idx
  ON public.search_history(user_id, searched_at DESC);

-- =========================================================
-- BOOKINGS: link to style
-- =========================================================
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS style_photo_id uuid REFERENCES public.style_photos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS style_reference_url text;

-- =========================================================
-- HELPER FUNCTIONS
-- =========================================================
CREATE OR REPLACE FUNCTION public.increment_view_count(photo_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.style_photos
    SET view_count = view_count + 1
    WHERE id = photo_id;
$$;

GRANT EXECUTE ON FUNCTION public.increment_view_count(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.increment_booking_count(photo_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.style_photos
    SET booking_count = booking_count + 1
    WHERE id = photo_id;
$$;

GRANT EXECUTE ON FUNCTION public.increment_booking_count(uuid) TO authenticated;

-- Keep saved_styles counter in sync
CREATE OR REPLACE FUNCTION public.sync_style_save_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.style_photos SET save_count = save_count + 1 WHERE id = NEW.style_photo_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.style_photos SET save_count = GREATEST(save_count - 1, 0) WHERE id = OLD.style_photo_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER saved_styles_count_trigger
  AFTER INSERT OR DELETE ON public.saved_styles
  FOR EACH ROW EXECUTE FUNCTION public.sync_style_save_count();

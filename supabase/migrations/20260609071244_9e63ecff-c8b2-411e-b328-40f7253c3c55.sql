
-- Queue entries table
CREATE TABLE public.queue_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id INT NOT NULL,
  client_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  service_name TEXT NOT NULL,
  service_price INT NOT NULL DEFAULT 0,
  service_duration_minutes INT NOT NULL DEFAULT 20,
  barber_name TEXT,
  position INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','called','serving','done','left','removed')),
  notify_at_position INT NOT NULL DEFAULT 2,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  called_at TIMESTAMPTZ,
  done_at TIMESTAMPTZ,
  removed_reason TEXT
);

CREATE INDEX queue_entries_shop_idx ON public.queue_entries (shop_id, status, position);
CREATE INDEX queue_entries_client_idx ON public.queue_entries (client_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.queue_entries TO anon, authenticated;
GRANT ALL ON public.queue_entries TO service_role;

ALTER TABLE public.queue_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read queue entries"
  ON public.queue_entries FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert queue entries"
  ON public.queue_entries FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update queue entries"
  ON public.queue_entries FOR UPDATE
  USING (true) WITH CHECK (true);

CREATE POLICY "Anyone can delete queue entries"
  ON public.queue_entries FOR DELETE
  USING (true);

-- Queue settings table
CREATE TABLE public.queue_settings (
  shop_id INT PRIMARY KEY,
  is_open BOOLEAN NOT NULL DEFAULT true,
  max_size INT NOT NULL DEFAULT 15,
  avg_cut_minutes INT NOT NULL DEFAULT 20,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.queue_settings TO anon, authenticated;
GRANT ALL ON public.queue_settings TO service_role;

ALTER TABLE public.queue_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read queue settings"
  ON public.queue_settings FOR SELECT USING (true);

CREATE POLICY "Anyone can upsert queue settings"
  ON public.queue_settings FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update queue settings"
  ON public.queue_settings FOR UPDATE USING (true) WITH CHECK (true);

-- Activity log
CREATE TABLE public.queue_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id INT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('joined','finished','left','called','removed','paused','resumed')),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX queue_activity_shop_idx ON public.queue_activity (shop_id, created_at DESC);

GRANT SELECT, INSERT ON public.queue_activity TO anon, authenticated;
GRANT ALL ON public.queue_activity TO service_role;

ALTER TABLE public.queue_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read activity" ON public.queue_activity FOR SELECT USING (true);
CREATE POLICY "Anyone can insert activity" ON public.queue_activity FOR INSERT WITH CHECK (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.queue_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.queue_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.queue_activity;

ALTER TABLE public.queue_entries REPLICA IDENTITY FULL;
ALTER TABLE public.queue_settings REPLICA IDENTITY FULL;
ALTER TABLE public.queue_activity REPLICA IDENTITY FULL;

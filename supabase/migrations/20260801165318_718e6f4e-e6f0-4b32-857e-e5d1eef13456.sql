CREATE TABLE public.saved_shops (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_id integer NOT NULL,
  saved_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, shop_id)
);

GRANT SELECT, INSERT, DELETE ON public.saved_shops TO authenticated;
GRANT ALL ON public.saved_shops TO service_role;

ALTER TABLE public.saved_shops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own saved shops"
ON public.saved_shops FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
CREATE TYPE public.app_role AS ENUM ('admin', 'owner', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

CREATE POLICY "Users can read own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admin visibility / management of shop owners
CREATE POLICY "Admins can view shop owners" ON public.shop_owners
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete shop owners" ON public.shop_owners
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admin-only assignment by email
CREATE OR REPLACE FUNCTION public.admin_assign_shop_owner(_email text, _shop_id integer)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem atribuir donos';
  END IF;

  SELECT id INTO _uid FROM auth.users WHERE lower(email) = lower(trim(_email)) LIMIT 1;
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Utilizador não encontrado para este email';
  END IF;

  INSERT INTO public.shop_owners (user_id, shop_id)
  VALUES (_uid, _shop_id)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_uid, 'owner')
  ON CONFLICT DO NOTHING;

  RETURN _uid;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_assign_shop_owner(text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_assign_shop_owner(text, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_shop_owners()
RETURNS TABLE (id uuid, user_id uuid, shop_id integer, email text, created_at timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores';
  END IF;
  RETURN QUERY
    SELECT so.id, so.user_id, so.shop_id, u.email::text, so.created_at
    FROM public.shop_owners so
    JOIN auth.users u ON u.id = so.user_id
    ORDER BY so.created_at DESC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_list_shop_owners() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_shop_owners() TO authenticated;
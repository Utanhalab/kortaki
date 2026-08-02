DROP FUNCTION IF EXISTS public.admin_list_shop_owners();

CREATE OR REPLACE FUNCTION public.admin_list_shop_owners()
RETURNS TABLE(
  id uuid,
  user_id uuid,
  shop_id integer,
  email text,
  created_at timestamp with time zone,
  account_exists boolean,
  email_confirmed boolean,
  is_banned boolean,
  is_deleted boolean,
  has_owner_role boolean,
  last_sign_in_at timestamp with time zone
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores';
  END IF;
  RETURN QUERY
    SELECT so.id,
           so.user_id,
           so.shop_id,
           COALESCE(u.email::text, 'conta removida'),
           so.created_at,
           (u.id IS NOT NULL),
           (u.email_confirmed_at IS NOT NULL),
           (u.banned_until IS NOT NULL AND u.banned_until > now()),
           (u.deleted_at IS NOT NULL),
           EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = so.user_id AND r.role = 'owner'),
           u.last_sign_in_at
    FROM public.shop_owners so
    LEFT JOIN auth.users u ON u.id = so.user_id
    ORDER BY so.created_at DESC;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_list_shop_owners() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_shop_owners() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_assign_shop_owner(_email text, _shop_id integer)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _u auth.users%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem atribuir donos';
  END IF;

  SELECT * INTO _u FROM auth.users WHERE lower(email) = lower(trim(_email)) LIMIT 1;
  IF _u.id IS NULL THEN
    RAISE EXCEPTION 'Utilizador não encontrado para este email';
  END IF;
  IF _u.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Esta conta foi removida e não pode ser dona de uma barbearia';
  END IF;
  IF _u.banned_until IS NOT NULL AND _u.banned_until > now() THEN
    RAISE EXCEPTION 'Esta conta está suspensa e não pode ser dona de uma barbearia';
  END IF;
  IF _u.email_confirmed_at IS NULL THEN
    RAISE EXCEPTION 'Esta conta ainda não confirmou o email';
  END IF;

  INSERT INTO public.shop_owners (user_id, shop_id)
  VALUES (_u.id, _shop_id)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_u.id, 'owner')
  ON CONFLICT DO NOTHING;

  RETURN _u.id;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_assign_shop_owner(text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_assign_shop_owner(text, integer) TO authenticated;
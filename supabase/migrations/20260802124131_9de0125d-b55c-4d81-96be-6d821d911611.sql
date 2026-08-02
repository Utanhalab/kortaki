CREATE TABLE public.owner_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  shop_id integer NOT NULL,
  target_user_id uuid,
  target_email text,
  actor_id uuid,
  actor_email text,
  details text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.owner_audit_log TO authenticated;
GRANT ALL ON public.owner_audit_log TO service_role;

ALTER TABLE public.owner_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read owner audit log"
ON public.owner_audit_log FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.log_shop_owner_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor_email text;
  _target_email text;
BEGIN
  SELECT email::text INTO _actor_email FROM auth.users WHERE id = auth.uid();
  IF TG_OP = 'INSERT' THEN
    SELECT email::text INTO _target_email FROM auth.users WHERE id = NEW.user_id;
    INSERT INTO public.owner_audit_log (action, shop_id, target_user_id, target_email, actor_id, actor_email, details)
    VALUES ('assign', NEW.shop_id, NEW.user_id, _target_email, auth.uid(), _actor_email, 'Dono atribuído à barbearia');
    RETURN NEW;
  ELSE
    SELECT email::text INTO _target_email FROM auth.users WHERE id = OLD.user_id;
    INSERT INTO public.owner_audit_log (action, shop_id, target_user_id, target_email, actor_id, actor_email, details)
    VALUES ('remove', OLD.shop_id, OLD.user_id, _target_email, auth.uid(), _actor_email, 'Atribuição de dono removida');
    RETURN OLD;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.log_shop_owner_change() FROM anon, authenticated, PUBLIC;

CREATE TRIGGER shop_owners_audit_insert
AFTER INSERT ON public.shop_owners
FOR EACH ROW EXECUTE FUNCTION public.log_shop_owner_change();

CREATE TRIGGER shop_owners_audit_delete
AFTER DELETE ON public.shop_owners
FOR EACH ROW EXECUTE FUNCTION public.log_shop_owner_change();

CREATE OR REPLACE FUNCTION public.admin_list_owner_audit(_limit integer DEFAULT 100)
RETURNS TABLE(id uuid, action text, shop_id integer, target_email text, actor_email text, details text, created_at timestamptz)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores';
  END IF;
  RETURN QUERY
    SELECT a.id, a.action, a.shop_id, a.target_email, a.actor_email, a.details, a.created_at
    FROM public.owner_audit_log a
    ORDER BY a.created_at DESC
    LIMIT COALESCE(_limit, 100);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_list_owner_audit(integer) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_owner_audit(integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_check_owner_status(_user_id uuid)
RETURNS TABLE(user_id uuid, email text, account_exists boolean, email_confirmed boolean, is_banned boolean, is_deleted boolean, has_owner_role boolean, last_sign_in_at timestamptz)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores';
  END IF;
  RETURN QUERY
    SELECT _user_id,
           COALESCE(u.email::text, 'conta removida'),
           (u.id IS NOT NULL),
           (u.email_confirmed_at IS NOT NULL),
           (u.banned_until IS NOT NULL AND u.banned_until > now()),
           (u.deleted_at IS NOT NULL),
           EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = _user_id AND r.role = 'owner'),
           u.last_sign_in_at
    FROM (SELECT 1) x
    LEFT JOIN auth.users u ON u.id = _user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_check_owner_status(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_check_owner_status(uuid) TO authenticated;

DROP POLICY IF EXISTS "Queue activity is viewable by everyone" ON public.queue_activity;
DROP POLICY IF EXISTS "Anyone can view queue activity" ON public.queue_activity;
DROP POLICY IF EXISTS "Public can read queue activity" ON public.queue_activity;
REVOKE SELECT ON public.queue_activity FROM anon;
CREATE POLICY "Authenticated users can view queue activity"
ON public.queue_activity FOR SELECT TO authenticated
USING (true);
CREATE OR REPLACE FUNCTION public.can_manage_user_access() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT coalesce(auth.uid() = 'd58f0c77-e079-4c01-aba5-b3dda75d8071'::uuid AND public.has_role(auth.uid(), 'admin') AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND active), false) $$;
REVOKE ALL ON FUNCTION public.can_manage_user_access() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_user_access() TO authenticated, service_role;
CREATE OR REPLACE FUNCTION public.protect_user_access_fields() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF auth.uid() IS NOT NULL AND NOT public.can_manage_user_access() THEN
  IF TG_OP = 'INSERT' THEN
   IF NOT NEW.active THEN RAISE EXCEPTION 'Somente Kesia pode bloquear usuários.'; END IF;
  ELSIF NEW.active IS DISTINCT FROM OLD.active OR NEW.email IS DISTINCT FROM OLD.email OR NEW.self_registered IS DISTINCT FROM OLD.self_registered THEN
   RAISE EXCEPTION 'Somente Kesia pode alterar campos de acesso de usuários.';
  END IF;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.protect_user_access_fields() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER protect_user_access_fields BEFORE INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.protect_user_access_fields();
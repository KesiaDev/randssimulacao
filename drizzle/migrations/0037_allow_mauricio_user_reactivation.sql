CREATE OR REPLACE FUNCTION public.protect_user_access_fields() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE may_reactivate boolean;
BEGIN
 IF auth.uid() IS NOT NULL AND NOT public.can_manage_user_access() THEN
  IF TG_OP = 'INSERT' THEN
   IF NOT NEW.active THEN RAISE EXCEPTION 'Somente Kesia pode bloquear usuários.'; END IF;
  ELSE
   may_reactivate := auth.uid() = 'a6df6d4c-87c9-4349-b1af-0f55e2dc4bfd'::uuid AND public.has_role(auth.uid(), 'admin') AND EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND active) AND OLD.active = false AND NEW.active = true;
   IF (NEW.active IS DISTINCT FROM OLD.active AND NOT may_reactivate) OR NEW.email IS DISTINCT FROM OLD.email OR NEW.self_registered IS DISTINCT FROM OLD.self_registered THEN
    RAISE EXCEPTION 'Somente Kesia pode bloquear ou alterar campos de acesso; Maurício pode reativar usuários.';
   END IF;
  END IF;
 END IF;
 RETURN NEW;
END $$;
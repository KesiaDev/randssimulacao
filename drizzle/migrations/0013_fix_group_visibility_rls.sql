-- The "groups read" / "administration_rates read" policies used inline
-- subqueries against group_dealers / administration_rate_dealers to decide
-- whether a group/rate had a dealer restriction. After 0012 scoped reads on
-- those two tables to the user's own dealer, those subqueries could no
-- longer see restriction rows belonging to OTHER dealers, so NOT EXISTS
-- always evaluated to true for non-admins -- every group/rate looked
-- "unrestricted" regardless of actual restrictions. These SECURITY DEFINER
-- helper functions bypass that RLS just for the visibility calculation,
-- without exposing group_dealers/administration_rate_dealers rows directly.
-- (Already applied live via the Lovable SQL editor on 2026-10-05; recorded
-- here for history/consistency with the rest of the migration set.)

CREATE OR REPLACE FUNCTION public.group_visible_to_user(_group_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    NOT EXISTS (SELECT 1 FROM group_dealers gd WHERE gd.group_id = _group_id)
    OR EXISTS (
      SELECT 1 FROM group_dealers gd
      JOIN profiles p ON p.dealer_id = gd.dealer_id
      WHERE gd.group_id = _group_id AND p.id = _user_id
    );
$$;

CREATE OR REPLACE FUNCTION public.administration_rate_visible_to_user(_rate_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    NOT EXISTS (SELECT 1 FROM administration_rate_dealers ard WHERE ard.administration_rate_id = _rate_id)
    OR EXISTS (
      SELECT 1 FROM administration_rate_dealers ard
      JOIN profiles p ON p.dealer_id = ard.dealer_id
      WHERE ard.administration_rate_id = _rate_id AND p.id = _user_id
    );
$$;

DROP POLICY IF EXISTS "groups read" ON public.groups;
CREATE POLICY "groups read" ON public.groups
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.group_visible_to_user(id, auth.uid())
);

DROP POLICY IF EXISTS "administration_rates read" ON public.administration_rates;
CREATE POLICY "administration_rates read" ON public.administration_rates
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.administration_rate_visible_to_user(id, auth.uid())
);

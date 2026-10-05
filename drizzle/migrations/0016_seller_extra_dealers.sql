CREATE TABLE IF NOT EXISTS public.seller_dealers (
  seller_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  dealer_id uuid NOT NULL REFERENCES public.dealers(id) ON DELETE CASCADE,
  PRIMARY KEY (seller_id, dealer_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seller_dealers TO authenticated;
GRANT ALL ON public.seller_dealers TO service_role;
ALTER TABLE public.seller_dealers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "seller_dealers admin" ON public.seller_dealers;
CREATE POLICY "seller_dealers admin" ON public.seller_dealers FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE OR REPLACE FUNCTION public.user_dealer_ids(_user_id uuid) RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT dealer_id FROM profiles WHERE id = _user_id AND dealer_id IS NOT NULL UNION SELECT dealer_id FROM seller_dealers WHERE seller_id = _user_id; $$;
REVOKE ALL ON FUNCTION public.user_dealer_ids(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_dealer_ids(uuid) TO authenticated, service_role;
CREATE OR REPLACE FUNCTION public.group_visible_to_user(_group_id uuid, _user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT NOT EXISTS (SELECT 1 FROM group_dealers gd WHERE gd.group_id = _group_id) OR EXISTS (SELECT 1 FROM group_dealers gd WHERE gd.group_id = _group_id AND gd.dealer_id IN (SELECT public.user_dealer_ids(_user_id))); $$;
CREATE OR REPLACE FUNCTION public.administration_rate_visible_to_user(_rate_id uuid, _user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT NOT EXISTS (SELECT 1 FROM administration_rate_dealers ard WHERE ard.administration_rate_id = _rate_id) OR EXISTS (SELECT 1 FROM administration_rate_dealers ard WHERE ard.administration_rate_id = _rate_id AND ard.dealer_id IN (SELECT public.user_dealer_ids(_user_id))); $$;
DROP POLICY IF EXISTS "dealers read" ON public.dealers;
CREATE POLICY "dealers read" ON public.dealers FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR (active AND dealers.id IN (SELECT public.user_dealer_ids(auth.uid()))));
DROP POLICY IF EXISTS "group_dealers read" ON public.group_dealers;
CREATE POLICY "group_dealers read" ON public.group_dealers FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR group_dealers.dealer_id IN (SELECT public.user_dealer_ids(auth.uid())));
DROP POLICY IF EXISTS "administration_rate_dealers read" ON public.administration_rate_dealers;
CREATE POLICY "administration_rate_dealers read" ON public.administration_rate_dealers FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR administration_rate_dealers.dealer_id IN (SELECT public.user_dealer_ids(auth.uid())));
DROP POLICY IF EXISTS "credit_ranges read" ON public.credit_ranges;
CREATE POLICY "credit_ranges read" ON public.credit_ranges FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR NOT EXISTS (SELECT 1 FROM public.group_dealers gd WHERE gd.group_id = credit_ranges.group_id) OR EXISTS (SELECT 1 FROM public.group_dealers gd WHERE gd.group_id = credit_ranges.group_id AND gd.dealer_id IN (SELECT public.user_dealer_ids(auth.uid()))));
DROP POLICY IF EXISTS "installment_types read" ON public.installment_types;
CREATE POLICY "installment_types read" ON public.installment_types FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR NOT EXISTS (SELECT 1 FROM public.group_dealers gd WHERE gd.group_id = installment_types.group_id) OR EXISTS (SELECT 1 FROM public.group_dealers gd WHERE gd.group_id = installment_types.group_id AND gd.dealer_id IN (SELECT public.user_dealer_ids(auth.uid()))));
DROP POLICY IF EXISTS "insurance_rules read" ON public.insurance_rules;
CREATE POLICY "insurance_rules read" ON public.insurance_rules FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR NOT EXISTS (SELECT 1 FROM public.group_dealers gd WHERE gd.group_id = insurance_rules.group_id) OR EXISTS (SELECT 1 FROM public.group_dealers gd WHERE gd.group_id = insurance_rules.group_id AND gd.dealer_id IN (SELECT public.user_dealer_ids(auth.uid()))));
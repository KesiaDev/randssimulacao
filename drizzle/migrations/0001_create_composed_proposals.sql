CREATE TABLE public.proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_name text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'finalized')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposals TO authenticated;
GRANT ALL ON public.proposals TO service_role;

ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers view own proposals and admins view all"
ON public.proposals FOR SELECT TO authenticated
USING (seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Sellers create own proposals"
ON public.proposals FOR INSERT TO authenticated
WITH CHECK (seller_id = auth.uid());

CREATE POLICY "Sellers update own proposals and admins update all"
ON public.proposals FOR UPDATE TO authenticated
USING (seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Sellers delete own draft proposals"
ON public.proposals FOR DELETE TO authenticated
USING (seller_id = auth.uid() AND status = 'draft');

CREATE TABLE public.proposal_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  simulation_id uuid REFERENCES public.simulations(id) ON DELETE SET NULL,
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity >= 1 AND quantity <= 999),
  group_id uuid REFERENCES public.groups(id) ON DELETE SET NULL,
  credit_range_id uuid REFERENCES public.credit_ranges(id) ON DELETE SET NULL,
  administration_rate_id uuid REFERENCES public.administration_rates(id) ON DELETE SET NULL,
  installment_type_id uuid REFERENCES public.installment_types(id) ON DELETE SET NULL,
  group_code text NOT NULL,
  credit_value numeric(14,2) NOT NULL CHECK (credit_value > 0),
  administration_rate numeric(10,6) NOT NULL,
  reserve_fund numeric(10,6) NOT NULL,
  installment_type_name text NOT NULL,
  installment_multiplier numeric(10,6) NOT NULL,
  initial_term integer NOT NULL CHECK (initial_term > 0),
  remaining_term integer NOT NULL CHECK (remaining_term >= 0),
  insurance_included boolean NOT NULL DEFAULT false,
  insurance_rate numeric(10,6) NOT NULL DEFAULT 0,
  base_amount numeric(18,8) NOT NULL,
  installment_amount numeric(18,8) NOT NULL,
  insurance_amount numeric(18,8) NOT NULL DEFAULT 0,
  final_amount numeric(18,8) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposal_items TO authenticated;
GRANT ALL ON public.proposal_items TO service_role;

ALTER TABLE public.proposal_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view accessible proposal items"
ON public.proposal_items FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.proposals p
  WHERE p.id = proposal_id
    AND (p.seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
));

CREATE POLICY "Users create own proposal items"
ON public.proposal_items FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.proposals p
  WHERE p.id = proposal_id AND p.seller_id = auth.uid()
));

CREATE POLICY "Users update accessible proposal items"
ON public.proposal_items FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.proposals p
  WHERE p.id = proposal_id
    AND (p.seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.proposals p
  WHERE p.id = proposal_id
    AND (p.seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
));

CREATE POLICY "Users delete accessible proposal items"
ON public.proposal_items FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.proposals p
  WHERE p.id = proposal_id
    AND (p.seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
));

CREATE INDEX proposal_items_proposal_id_idx ON public.proposal_items(proposal_id);
CREATE INDEX proposals_seller_created_idx ON public.proposals(seller_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.set_proposal_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER proposals_set_updated_at
BEFORE UPDATE ON public.proposals
FOR EACH ROW EXECUTE FUNCTION public.set_proposal_updated_at();
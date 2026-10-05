-- Restrict the six selected authenticated read policies to administrators or the seller's dealer scope.

DROP POLICY IF EXISTS "dealers read" ON public.dealers;
CREATE POLICY "dealers read"
ON public.dealers
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR (
    active
    AND EXISTS (
      SELECT 1
      FROM public.profiles pr
      WHERE pr.id = auth.uid()
        AND pr.dealer_id = dealers.id
    )
  )
);

DROP POLICY IF EXISTS "group_dealers read" ON public.group_dealers;
CREATE POLICY "group_dealers read"
ON public.group_dealers
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR EXISTS (
    SELECT 1
    FROM public.profiles pr
    WHERE pr.id = auth.uid()
      AND pr.dealer_id = group_dealers.dealer_id
  )
);

DROP POLICY IF EXISTS "administration_rate_dealers read" ON public.administration_rate_dealers;
CREATE POLICY "administration_rate_dealers read"
ON public.administration_rate_dealers
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR EXISTS (
    SELECT 1
    FROM public.profiles pr
    WHERE pr.id = auth.uid()
      AND pr.dealer_id = administration_rate_dealers.dealer_id
  )
);

DROP POLICY IF EXISTS "credit_ranges read" ON public.credit_ranges;
CREATE POLICY "credit_ranges read"
ON public.credit_ranges
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR NOT EXISTS (
    SELECT 1 FROM public.group_dealers gd
    WHERE gd.group_id = credit_ranges.group_id
  )
  OR EXISTS (
    SELECT 1
    FROM public.group_dealers gd
    JOIN public.profiles pr ON pr.id = auth.uid()
    WHERE gd.group_id = credit_ranges.group_id
      AND gd.dealer_id = pr.dealer_id
  )
);

DROP POLICY IF EXISTS "installment_types read" ON public.installment_types;
CREATE POLICY "installment_types read"
ON public.installment_types
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR NOT EXISTS (
    SELECT 1 FROM public.group_dealers gd
    WHERE gd.group_id = installment_types.group_id
  )
  OR EXISTS (
    SELECT 1
    FROM public.group_dealers gd
    JOIN public.profiles pr ON pr.id = auth.uid()
    WHERE gd.group_id = installment_types.group_id
      AND gd.dealer_id = pr.dealer_id
  )
);

DROP POLICY IF EXISTS "insurance_rules read" ON public.insurance_rules;
CREATE POLICY "insurance_rules read"
ON public.insurance_rules
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR NOT EXISTS (
    SELECT 1 FROM public.group_dealers gd
    WHERE gd.group_id = insurance_rules.group_id
  )
  OR EXISTS (
    SELECT 1
    FROM public.group_dealers gd
    JOIN public.profiles pr ON pr.id = auth.uid()
    WHERE gd.group_id = insurance_rules.group_id
      AND gd.dealer_id = pr.dealer_id
  )
);
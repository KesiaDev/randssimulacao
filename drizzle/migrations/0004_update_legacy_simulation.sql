CREATE OR REPLACE FUNCTION public.update_legacy_simulation(_simulation_id uuid, _client_name text, _item jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _seller_id uuid;
BEGIN
  SELECT seller_id
  INTO _seller_id
  FROM public.simulations
  WHERE id = _simulation_id
  FOR UPDATE;

  IF _seller_id IS NULL OR NOT (_seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  IF _item IS NULL OR jsonb_typeof(_item) <> 'object' THEN
    RAISE EXCEPTION 'Dados da simulação inválidos';
  END IF;

  UPDATE public.simulations
  SET
    client_name = NULLIF(trim(_client_name), ''),
    group_id = (_item->>'group_id')::uuid,
    credit_range_id = (_item->>'credit_range_id')::uuid,
    administration_rate_id = (_item->>'administration_rate_id')::uuid,
    installment_type_id = (_item->>'installment_type_id')::uuid,
    group_code = _item->>'group_code',
    credit_value = (_item->>'credit_value')::numeric,
    administration_rate = (_item->>'administration_rate')::numeric,
    reserve_fund = (_item->>'reserve_fund')::numeric,
    installment_type_name = _item->>'installment_type_name',
    installment_multiplier = (_item->>'installment_multiplier')::numeric,
    initial_term = (_item->>'initial_term')::integer,
    remaining_term = (_item->>'remaining_term')::integer,
    insurance_included = (_item->>'insurance_included')::boolean,
    insurance_rate = (_item->>'insurance_rate')::numeric,
    base_amount = (_item->>'base_amount')::numeric,
    installment_amount = (_item->>'installment_amount')::numeric,
    insurance_amount = (_item->>'insurance_amount')::numeric,
    final_amount = (_item->>'final_amount')::numeric
  WHERE id = _simulation_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.update_legacy_simulation(uuid, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_legacy_simulation(uuid, text, jsonb) TO authenticated;
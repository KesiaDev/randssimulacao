CREATE OR REPLACE FUNCTION public.replace_proposal_items(_proposal_id uuid, _client_name text, _items jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _seller_id uuid;
  _item jsonb;
  _simulation_id uuid;
BEGIN
  SELECT seller_id INTO _seller_id FROM public.proposals WHERE id = _proposal_id FOR UPDATE;
  IF _seller_id IS NULL OR NOT (_seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  IF jsonb_typeof(_items) <> 'array' OR jsonb_array_length(_items) = 0 THEN
    RAISE EXCEPTION 'A proposta precisa ter ao menos um item';
  END IF;

  DELETE FROM public.simulations
  WHERE id IN (SELECT simulation_id FROM public.proposal_items WHERE proposal_id = _proposal_id AND simulation_id IS NOT NULL);
  DELETE FROM public.proposal_items WHERE proposal_id = _proposal_id;
  UPDATE public.proposals SET client_name = NULLIF(trim(_client_name), ''), status = 'finalized', updated_at = now() WHERE id = _proposal_id;

  FOR _item IN SELECT value FROM jsonb_array_elements(_items)
  LOOP
    IF ((_item->>'quantity')::integer < 1 OR (_item->>'quantity')::integer > 999) THEN
      RAISE EXCEPTION 'Quantidade inválida';
    END IF;
    INSERT INTO public.simulations (seller_id, client_name, group_id, credit_range_id, administration_rate_id, installment_type_id, group_code, credit_value, administration_rate, reserve_fund, installment_type_name, installment_multiplier, initial_term, remaining_term, insurance_included, insurance_rate, base_amount, installment_amount, insurance_amount, final_amount)
    VALUES (_seller_id, NULLIF(trim(_client_name), ''), (_item->>'group_id')::uuid, (_item->>'credit_range_id')::uuid, (_item->>'administration_rate_id')::uuid, (_item->>'installment_type_id')::uuid, _item->>'group_code', (_item->>'credit_value')::numeric, (_item->>'administration_rate')::numeric, (_item->>'reserve_fund')::numeric, _item->>'installment_type_name', (_item->>'installment_multiplier')::numeric, (_item->>'initial_term')::integer, (_item->>'remaining_term')::integer, (_item->>'insurance_included')::boolean, (_item->>'insurance_rate')::numeric, (_item->>'base_amount')::numeric, (_item->>'installment_amount')::numeric, (_item->>'insurance_amount')::numeric, (_item->>'final_amount')::numeric)
    RETURNING id INTO _simulation_id;
    INSERT INTO public.proposal_items (proposal_id, simulation_id, sort_order, quantity, group_id, credit_range_id, administration_rate_id, installment_type_id, group_code, credit_value, administration_rate, reserve_fund, installment_type_name, installment_multiplier, initial_term, remaining_term, insurance_included, insurance_rate, base_amount, installment_amount, insurance_amount, final_amount)
    VALUES (_proposal_id, _simulation_id, (_item->>'sort_order')::integer, (_item->>'quantity')::integer, (_item->>'group_id')::uuid, (_item->>'credit_range_id')::uuid, (_item->>'administration_rate_id')::uuid, (_item->>'installment_type_id')::uuid, _item->>'group_code', (_item->>'credit_value')::numeric, (_item->>'administration_rate')::numeric, (_item->>'reserve_fund')::numeric, _item->>'installment_type_name', (_item->>'installment_multiplier')::numeric, (_item->>'initial_term')::integer, (_item->>'remaining_term')::integer, (_item->>'insurance_included')::boolean, (_item->>'insurance_rate')::numeric, (_item->>'base_amount')::numeric, (_item->>'installment_amount')::numeric, (_item->>'insurance_amount')::numeric, (_item->>'final_amount')::numeric);
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_saved_proposal(_proposal_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _seller_id uuid;
BEGIN
  SELECT seller_id INTO _seller_id FROM public.proposals WHERE id = _proposal_id FOR UPDATE;
  IF _seller_id IS NULL OR NOT (_seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  DELETE FROM public.simulations WHERE id IN (SELECT simulation_id FROM public.proposal_items WHERE proposal_id = _proposal_id AND simulation_id IS NOT NULL);
  DELETE FROM public.proposal_items WHERE proposal_id = _proposal_id;
  DELETE FROM public.proposals WHERE id = _proposal_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_legacy_simulation(_simulation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _seller_id uuid;
BEGIN
  SELECT seller_id INTO _seller_id FROM public.simulations WHERE id = _simulation_id FOR UPDATE;
  IF _seller_id IS NULL OR NOT (_seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  DELETE FROM public.simulations WHERE id = _simulation_id;
END;
$$;

REVOKE ALL ON FUNCTION public.replace_proposal_items(uuid, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_saved_proposal(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_legacy_simulation(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.replace_proposal_items(uuid, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_saved_proposal(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_legacy_simulation(uuid) TO authenticated;
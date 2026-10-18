-- Modalidade de contratação (Prorrogada / Diluída).
-- Não destrutiva: registros existentes recebem 'prorrogada', que é o comportamento histórico.
ALTER TABLE public.simulations
  ADD COLUMN IF NOT EXISTS contract_modality text NOT NULL DEFAULT 'prorrogada';
ALTER TABLE public.proposal_items
  ADD COLUMN IF NOT EXISTS contract_modality text NOT NULL DEFAULT 'prorrogada';

DO $migration$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'simulations_contract_modality_check') THEN
    ALTER TABLE public.simulations
      ADD CONSTRAINT simulations_contract_modality_check CHECK (contract_modality IN ('prorrogada', 'diluida'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'proposal_items_contract_modality_check') THEN
    ALTER TABLE public.proposal_items
      ADD CONSTRAINT proposal_items_contract_modality_check CHECK (contract_modality IN ('prorrogada', 'diluida'));
  END IF;
END;
$migration$;

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
    INSERT INTO public.simulations (seller_id, client_name, group_id, credit_range_id, administration_rate_id, installment_type_id, group_code, credit_value, administration_rate, reserve_fund, installment_type_name, installment_multiplier, initial_term, remaining_term, contract_modality, insurance_included, insurance_rate, base_amount, installment_amount, insurance_amount, final_amount)
    VALUES (_seller_id, NULLIF(trim(_client_name), ''), (_item->>'group_id')::uuid, (_item->>'credit_range_id')::uuid, (_item->>'administration_rate_id')::uuid, (_item->>'installment_type_id')::uuid, _item->>'group_code', (_item->>'credit_value')::numeric, (_item->>'administration_rate')::numeric, (_item->>'reserve_fund')::numeric, _item->>'installment_type_name', (_item->>'installment_multiplier')::numeric, (_item->>'initial_term')::integer, (_item->>'remaining_term')::integer, COALESCE(_item->>'contract_modality', 'prorrogada'), (_item->>'insurance_included')::boolean, (_item->>'insurance_rate')::numeric, (_item->>'base_amount')::numeric, (_item->>'installment_amount')::numeric, (_item->>'insurance_amount')::numeric, (_item->>'final_amount')::numeric)
    RETURNING id INTO _simulation_id;
    INSERT INTO public.proposal_items (proposal_id, simulation_id, sort_order, quantity, group_id, credit_range_id, administration_rate_id, installment_type_id, group_code, credit_value, administration_rate, reserve_fund, installment_type_name, installment_multiplier, initial_term, remaining_term, contract_modality, insurance_included, insurance_rate, base_amount, installment_amount, insurance_amount, final_amount)
    VALUES (_proposal_id, _simulation_id, (_item->>'sort_order')::integer, (_item->>'quantity')::integer, (_item->>'group_id')::uuid, (_item->>'credit_range_id')::uuid, (_item->>'administration_rate_id')::uuid, (_item->>'installment_type_id')::uuid, _item->>'group_code', (_item->>'credit_value')::numeric, (_item->>'administration_rate')::numeric, (_item->>'reserve_fund')::numeric, _item->>'installment_type_name', (_item->>'installment_multiplier')::numeric, (_item->>'initial_term')::integer, (_item->>'remaining_term')::integer, COALESCE(_item->>'contract_modality', 'prorrogada'), (_item->>'insurance_included')::boolean, (_item->>'insurance_rate')::numeric, (_item->>'base_amount')::numeric, (_item->>'installment_amount')::numeric, (_item->>'insurance_amount')::numeric, (_item->>'final_amount')::numeric);
  END LOOP;
END;
$$;

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
    contract_modality = COALESCE(_item->>'contract_modality', 'prorrogada'),
    insurance_included = (_item->>'insurance_included')::boolean,
    insurance_rate = (_item->>'insurance_rate')::numeric,
    base_amount = (_item->>'base_amount')::numeric,
    installment_amount = (_item->>'installment_amount')::numeric,
    insurance_amount = (_item->>'insurance_amount')::numeric,
    final_amount = (_item->>'final_amount')::numeric
  WHERE id = _simulation_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_history_page(_client text, _page integer DEFAULT 1, _page_size integer DEFAULT 10, _group text DEFAULT NULL, _seller text DEFAULT NULL, _date date DEFAULT NULL, _credit text DEFAULT NULL)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path TO 'public' AS $function$
WITH proposal_rows AS (
 SELECT p.id, p.created_at, jsonb_build_object('kind','proposal','id',p.id,'seller_id',p.seller_id,'seller_name',COALESCE(pr.name,pr.email,'—'),'client_name',p.client_name,'created_at',p.created_at,'items',COALESCE(jsonb_agg(jsonb_build_object('quantity',pi.quantity,'group_code',pi.group_code,'credit_value',pi.credit_value,'final_amount',pi.final_amount,'simulation_id',pi.simulation_id,'contract_modality',pi.contract_modality) ORDER BY pi.sort_order),'[]'::jsonb)) AS entry
 FROM public.proposals p LEFT JOIN public.profiles pr ON pr.id=p.seller_id JOIN public.proposal_items pi ON pi.proposal_id=p.id
 WHERE (NULLIF(trim(_client),'') IS NULL OR strpos(lower(COALESCE(p.client_name,'')),lower(trim(_client))) > 0)
 AND (NULLIF(trim(_seller),'') IS NULL OR strpos(lower(COALESCE(pr.name,pr.email,'')),lower(trim(_seller))) > 0)
 AND (_date IS NULL OR (p.created_at AT TIME ZONE 'America/Sao_Paulo')::date=_date)
 AND (NULLIF(trim(_group),'') IS NULL OR EXISTS (SELECT 1 FROM public.proposal_items fpi WHERE fpi.proposal_id=p.id AND fpi.group_code=trim(_group)))
 AND (NULLIF(regexp_replace(COALESCE(_credit,''),'\D','','g'),'') IS NULL OR EXISTS (SELECT 1 FROM public.proposal_items fpi WHERE fpi.proposal_id=p.id AND regexp_replace(fpi.credit_value::text,'\D','','g') LIKE '%' || regexp_replace(_credit,'\D','','g') || '%'))
 GROUP BY p.id,p.created_at,p.seller_id,p.client_name,pr.name,pr.email
), legacy_rows AS (
 SELECT s.id,s.created_at,jsonb_build_object('kind','simulation','id',s.id,'seller_id',s.seller_id,'seller_name',COALESCE(pr.name,pr.email,'—'),'client_name',s.client_name,'created_at',s.created_at,'group_code',s.group_code,'credit_value',s.credit_value,'administration_rate',s.administration_rate,'installment_type_name',s.installment_type_name,'contract_modality',s.contract_modality,'insurance_included',s.insurance_included,'final_amount',s.final_amount) AS entry
 FROM public.simulations s LEFT JOIN public.profiles pr ON pr.id=s.seller_id
 WHERE NOT EXISTS (SELECT 1 FROM public.proposal_items pi WHERE pi.simulation_id=s.id)
 AND (NULLIF(trim(_client),'') IS NULL OR strpos(lower(COALESCE(s.client_name,'')),lower(trim(_client))) > 0)
 AND (NULLIF(trim(_seller),'') IS NULL OR strpos(lower(COALESCE(pr.name,pr.email,'')),lower(trim(_seller))) > 0)
 AND (_date IS NULL OR (s.created_at AT TIME ZONE 'America/Sao_Paulo')::date=_date)
 AND (NULLIF(trim(_group),'') IS NULL OR s.group_code=trim(_group))
 AND (NULLIF(regexp_replace(COALESCE(_credit,''),'\D','','g'),'') IS NULL OR regexp_replace(s.credit_value::text,'\D','','g') LIKE '%' || regexp_replace(_credit,'\D','','g') || '%')
), combined AS (SELECT * FROM proposal_rows UNION ALL SELECT * FROM legacy_rows), page_rows AS (
 SELECT entry FROM combined ORDER BY created_at DESC,id DESC LIMIT LEAST(GREATEST(_page_size,1),50) OFFSET (GREATEST(_page,1)-1)*LEAST(GREATEST(_page_size,1),50)
)
SELECT jsonb_build_object('total',(SELECT count(*) FROM combined),'entries',COALESCE((SELECT jsonb_agg(entry) FROM page_rows),'[]'::jsonb));
$function$;

REVOKE ALL ON FUNCTION public.replace_proposal_items(uuid, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.replace_proposal_items(uuid, text, jsonb) TO authenticated;
REVOKE ALL ON FUNCTION public.update_legacy_simulation(uuid, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_legacy_simulation(uuid, text, jsonb) TO authenticated;
REVOKE ALL ON FUNCTION public.get_history_page(text,integer,integer,text,text,date,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_history_page(text,integer,integer,text,text,date,text) TO authenticated, service_role;

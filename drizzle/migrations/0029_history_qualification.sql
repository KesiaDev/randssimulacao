ALTER TABLE public.proposals ADD COLUMN qualification text NOT NULL DEFAULT 'unqualified' CHECK (qualification IN ('unqualified','hot','warm','cold','won','lost'));
ALTER TABLE public.simulations ADD COLUMN qualification text NOT NULL DEFAULT 'unqualified' CHECK (qualification IN ('unqualified','hot','warm','cold','won','lost'));
CREATE OR REPLACE FUNCTION public.set_history_qualification(_id uuid, _kind text, _qualification text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE owner_id uuid;
BEGIN
IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Acesso negado' USING ERRCODE='42501'; END IF;
IF _qualification IS NULL OR _qualification NOT IN ('unqualified','hot','warm','cold','won','lost') THEN RAISE EXCEPTION 'Qualificação inválida'; END IF;
IF _kind='proposal' THEN
SELECT seller_id INTO owner_id FROM public.proposals WHERE id=_id FOR UPDATE;
ELSIF _kind='simulation' THEN
SELECT seller_id INTO owner_id FROM public.simulations WHERE id=_id AND NOT EXISTS (SELECT 1 FROM public.proposal_items WHERE simulation_id=_id) FOR UPDATE;
ELSE RAISE EXCEPTION 'Registro inválido'; END IF;
IF owner_id IS NULL OR NOT (owner_id=auth.uid() OR public.has_role(auth.uid(),'admin')) THEN RAISE EXCEPTION 'Acesso negado' USING ERRCODE='42501'; END IF;
IF _kind='proposal' THEN UPDATE public.proposals SET qualification=_qualification WHERE id=_id;
ELSE UPDATE public.simulations SET qualification=_qualification WHERE id=_id; END IF;
END; $$;
REVOKE ALL ON FUNCTION public.set_history_qualification(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_history_qualification(uuid,text,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.get_qualified_history(_client text DEFAULT '', _page integer DEFAULT 1, _page_size integer DEFAULT 10, _seller text DEFAULT '', _from date DEFAULT NULL, _to date DEFAULT NULL, _qualification text DEFAULT '')
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path TO 'public' AS $$
WITH proposal_rows AS (
SELECT p.id,p.created_at,jsonb_build_object('kind','proposal','id',p.id,'seller_id',p.seller_id,'seller_name',coalesce(pr.name,pr.email,'—'),'client_name',p.client_name,'created_at',p.created_at,'qualification',p.qualification,'items',jsonb_agg(jsonb_build_object('quantity',pi.quantity,'group_code',pi.group_code,'credit_value',pi.credit_value,'final_amount',pi.final_amount,'simulation_id',pi.simulation_id,'contract_modality',pi.contract_modality) ORDER BY pi.sort_order)) entry
FROM public.proposals p LEFT JOIN public.profiles pr ON pr.id=p.seller_id JOIN public.proposal_items pi ON pi.proposal_id=p.id
WHERE (_from IS NULL OR p.created_at >= (_from::timestamp AT TIME ZONE 'America/Sao_Paulo')) AND (_to IS NULL OR p.created_at < ((_to+1)::timestamp AT TIME ZONE 'America/Sao_Paulo'))
AND (coalesce(trim(_client),'')='' OR strpos(lower(coalesce(p.client_name,'')),lower(trim(_client)))>0)
AND (coalesce(trim(_seller),'')='' OR strpos(lower(coalesce(pr.name,pr.email,'')),lower(trim(_seller)))>0)
AND (coalesce(_qualification,'')='' OR p.qualification=_qualification)
GROUP BY p.id,p.created_at,p.seller_id,p.client_name,pr.name,pr.email
), legacy_rows AS (
SELECT s.id,s.created_at,jsonb_build_object('kind','simulation','id',s.id,'seller_id',s.seller_id,'seller_name',coalesce(pr.name,pr.email,'—'),'client_name',s.client_name,'created_at',s.created_at,'qualification',s.qualification,'group_code',s.group_code,'credit_value',s.credit_value,'administration_rate',s.administration_rate,'installment_type_name',s.installment_type_name,'contract_modality',s.contract_modality,'insurance_included',s.insurance_included,'final_amount',s.final_amount) entry
FROM public.simulations s LEFT JOIN public.profiles pr ON pr.id=s.seller_id
WHERE NOT EXISTS(SELECT 1 FROM public.proposal_items pi WHERE pi.simulation_id=s.id)
AND (_from IS NULL OR s.created_at >= (_from::timestamp AT TIME ZONE 'America/Sao_Paulo')) AND (_to IS NULL OR s.created_at < ((_to+1)::timestamp AT TIME ZONE 'America/Sao_Paulo'))
AND (coalesce(trim(_client),'')='' OR strpos(lower(coalesce(s.client_name,'')),lower(trim(_client)))>0)
AND (coalesce(trim(_seller),'')='' OR strpos(lower(coalesce(pr.name,pr.email,'')),lower(trim(_seller)))>0)
AND (coalesce(_qualification,'')='' OR s.qualification=_qualification)
), combined AS(SELECT * FROM proposal_rows UNION ALL SELECT * FROM legacy_rows), paged AS(SELECT entry FROM combined ORDER BY created_at DESC,id DESC LIMIT least(greatest(_page_size,1),50) OFFSET (greatest(_page,1)-1)*least(greatest(_page_size,1),50))
SELECT jsonb_build_object('total',(SELECT count(*) FROM combined),'entries',coalesce((SELECT jsonb_agg(entry) FROM paged),'[]'::jsonb)); $$;
REVOKE ALL ON FUNCTION public.get_qualified_history(text,integer,integer,text,date,date,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_qualified_history(text,integer,integer,text,date,date,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.get_qualified_dealer_history(_client text DEFAULT '', _page integer DEFAULT 1, _seller text DEFAULT '', _from date DEFAULT NULL, _to date DEFAULT NULL, _qualification text DEFAULT '')
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
WITH proposal_rows AS (
SELECT p.id,p.created_at,jsonb_build_object('kind','proposal','id',p.id,'seller_id',p.seller_id,'seller_name',pr.name,'client_name',p.client_name,'created_at',p.created_at,'qualification',p.qualification,'items',jsonb_agg(jsonb_build_object('quantity',pi.quantity,'group_code',pi.group_code,'credit_value',pi.credit_value,'final_amount',pi.final_amount,'simulation_id',pi.simulation_id,'contract_modality',pi.contract_modality) ORDER BY pi.sort_order)) entry
FROM public.proposals p JOIN public.profiles pr ON pr.id=p.seller_id JOIN public.proposal_items pi ON pi.proposal_id=p.id
WHERE public.manager_can_read_seller(p.seller_id)
AND (_from IS NULL OR p.created_at >= (_from::timestamp AT TIME ZONE 'America/Sao_Paulo')) AND (_to IS NULL OR p.created_at < ((_to+1)::timestamp AT TIME ZONE 'America/Sao_Paulo'))
AND (coalesce(trim(_client),'')='' OR strpos(lower(coalesce(p.client_name,'')),lower(trim(_client)))>0)
AND (coalesce(trim(_seller),'')='' OR strpos(lower(pr.name),lower(trim(_seller)))>0)
AND (coalesce(_qualification,'')='' OR p.qualification=_qualification)
GROUP BY p.id,p.created_at,p.seller_id,p.client_name,pr.name
), legacy_rows AS (
SELECT s.id,s.created_at,jsonb_build_object('kind','simulation','id',s.id,'seller_id',s.seller_id,'seller_name',pr.name,'client_name',s.client_name,'created_at',s.created_at,'qualification',s.qualification,'group_code',s.group_code,'credit_value',s.credit_value,'administration_rate',s.administration_rate,'installment_type_name',s.installment_type_name,'contract_modality',s.contract_modality,'insurance_included',s.insurance_included,'final_amount',s.final_amount) entry
FROM public.simulations s JOIN public.profiles pr ON pr.id=s.seller_id
WHERE public.manager_can_read_seller(s.seller_id) AND NOT EXISTS(SELECT 1 FROM public.proposal_items pi WHERE pi.simulation_id=s.id)
AND (_from IS NULL OR s.created_at >= (_from::timestamp AT TIME ZONE 'America/Sao_Paulo')) AND (_to IS NULL OR s.created_at < ((_to+1)::timestamp AT TIME ZONE 'America/Sao_Paulo'))
AND (coalesce(trim(_client),'')='' OR strpos(lower(coalesce(s.client_name,'')),lower(trim(_client)))>0)
AND (coalesce(trim(_seller),'')='' OR strpos(lower(pr.name),lower(trim(_seller)))>0)
AND (coalesce(_qualification,'')='' OR s.qualification=_qualification)
), combined AS(SELECT * FROM proposal_rows UNION ALL SELECT * FROM legacy_rows), paged AS(SELECT entry FROM combined ORDER BY created_at DESC,id DESC LIMIT 10 OFFSET (greatest(_page,1)-1)*10)
SELECT jsonb_build_object('total',(SELECT count(*) FROM combined),'entries',coalesce((SELECT jsonb_agg(entry) FROM paged),'[]'::jsonb)); $$;
REVOKE ALL ON FUNCTION public.get_qualified_dealer_history(text,integer,text,date,date,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_qualified_dealer_history(text,integer,text,date,date,text) TO authenticated;
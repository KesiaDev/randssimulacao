CREATE OR REPLACE FUNCTION public.get_history_range(_client text DEFAULT '', _page integer DEFAULT 1, _page_size integer DEFAULT 10, _seller text DEFAULT '', _from date DEFAULT NULL, _to date DEFAULT NULL)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path TO 'public' AS $$
WITH proposal_rows AS (
SELECT p.id,p.created_at,jsonb_build_object('kind','proposal','id',p.id,'seller_id',p.seller_id,'seller_name',coalesce(pr.name,pr.email,'—'),'client_name',p.client_name,'created_at',p.created_at,'items',jsonb_agg(jsonb_build_object('quantity',pi.quantity,'group_code',pi.group_code,'credit_value',pi.credit_value,'final_amount',pi.final_amount,'simulation_id',pi.simulation_id,'contract_modality',pi.contract_modality) ORDER BY pi.sort_order)) entry
FROM public.proposals p LEFT JOIN public.profiles pr ON pr.id=p.seller_id JOIN public.proposal_items pi ON pi.proposal_id=p.id
WHERE (_from IS NULL OR p.created_at >= (_from::timestamp AT TIME ZONE 'America/Sao_Paulo')) AND (_to IS NULL OR p.created_at < ((_to+1)::timestamp AT TIME ZONE 'America/Sao_Paulo'))
AND (coalesce(trim(_client),'')='' OR strpos(lower(coalesce(p.client_name,'')),lower(trim(_client)))>0)
AND (coalesce(trim(_seller),'')='' OR strpos(lower(coalesce(pr.name,pr.email,'')),lower(trim(_seller)))>0)
GROUP BY p.id,p.created_at,p.seller_id,p.client_name,pr.name,pr.email
), legacy_rows AS (
SELECT s.id,s.created_at,jsonb_build_object('kind','simulation','id',s.id,'seller_id',s.seller_id,'seller_name',coalesce(pr.name,pr.email,'—'),'client_name',s.client_name,'created_at',s.created_at,'group_code',s.group_code,'credit_value',s.credit_value,'administration_rate',s.administration_rate,'installment_type_name',s.installment_type_name,'contract_modality',s.contract_modality,'insurance_included',s.insurance_included,'final_amount',s.final_amount) entry
FROM public.simulations s LEFT JOIN public.profiles pr ON pr.id=s.seller_id
WHERE NOT EXISTS(SELECT 1 FROM public.proposal_items pi WHERE pi.simulation_id=s.id)
AND (_from IS NULL OR s.created_at >= (_from::timestamp AT TIME ZONE 'America/Sao_Paulo')) AND (_to IS NULL OR s.created_at < ((_to+1)::timestamp AT TIME ZONE 'America/Sao_Paulo'))
AND (coalesce(trim(_client),'')='' OR strpos(lower(coalesce(s.client_name,'')),lower(trim(_client)))>0)
AND (coalesce(trim(_seller),'')='' OR strpos(lower(coalesce(pr.name,pr.email,'')),lower(trim(_seller)))>0)
), combined AS(SELECT * FROM proposal_rows UNION ALL SELECT * FROM legacy_rows), paged AS(SELECT entry FROM combined ORDER BY created_at DESC,id DESC LIMIT least(greatest(_page_size,1),50) OFFSET (greatest(_page,1)-1)*least(greatest(_page_size,1),50))
SELECT jsonb_build_object('total',(SELECT count(*) FROM combined),'entries',coalesce((SELECT jsonb_agg(entry) FROM paged),'[]'::jsonb)); $$;
REVOKE ALL ON FUNCTION public.get_history_range(text,integer,integer,text,date,date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_history_range(text,integer,integer,text,date,date) TO authenticated;
CREATE OR REPLACE FUNCTION public.get_dealer_manager_history_range(_client text DEFAULT '', _page integer DEFAULT 1, _seller text DEFAULT '', _from date DEFAULT NULL, _to date DEFAULT NULL)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
WITH proposal_rows AS (
SELECT p.id,p.created_at,jsonb_build_object('kind','proposal','id',p.id,'seller_id',p.seller_id,'seller_name',pr.name,'client_name',p.client_name,'created_at',p.created_at,'items',jsonb_agg(jsonb_build_object('quantity',pi.quantity,'group_code',pi.group_code,'credit_value',pi.credit_value,'final_amount',pi.final_amount,'simulation_id',pi.simulation_id,'contract_modality',pi.contract_modality) ORDER BY pi.sort_order)) entry
FROM public.proposals p JOIN public.profiles pr ON pr.id=p.seller_id JOIN public.proposal_items pi ON pi.proposal_id=p.id
WHERE public.manager_can_read_seller(p.seller_id)
AND (_from IS NULL OR p.created_at >= (_from::timestamp AT TIME ZONE 'America/Sao_Paulo')) AND (_to IS NULL OR p.created_at < ((_to+1)::timestamp AT TIME ZONE 'America/Sao_Paulo'))
AND (coalesce(trim(_client),'')='' OR strpos(lower(coalesce(p.client_name,'')),lower(trim(_client)))>0)
AND (coalesce(trim(_seller),'')='' OR strpos(lower(pr.name),lower(trim(_seller)))>0)
GROUP BY p.id,p.created_at,p.seller_id,p.client_name,pr.name
), legacy_rows AS (
SELECT s.id,s.created_at,jsonb_build_object('kind','simulation','id',s.id,'seller_id',s.seller_id,'seller_name',pr.name,'client_name',s.client_name,'created_at',s.created_at,'group_code',s.group_code,'credit_value',s.credit_value,'administration_rate',s.administration_rate,'installment_type_name',s.installment_type_name,'contract_modality',s.contract_modality,'insurance_included',s.insurance_included,'final_amount',s.final_amount) entry
FROM public.simulations s JOIN public.profiles pr ON pr.id=s.seller_id
WHERE public.manager_can_read_seller(s.seller_id) AND NOT EXISTS(SELECT 1 FROM public.proposal_items pi WHERE pi.simulation_id=s.id)
AND (_from IS NULL OR s.created_at >= (_from::timestamp AT TIME ZONE 'America/Sao_Paulo')) AND (_to IS NULL OR s.created_at < ((_to+1)::timestamp AT TIME ZONE 'America/Sao_Paulo'))
AND (coalesce(trim(_client),'')='' OR strpos(lower(coalesce(s.client_name,'')),lower(trim(_client)))>0)
AND (coalesce(trim(_seller),'')='' OR strpos(lower(pr.name),lower(trim(_seller)))>0)
), combined AS(SELECT * FROM proposal_rows UNION ALL SELECT * FROM legacy_rows), paged AS(SELECT entry FROM combined ORDER BY created_at DESC,id DESC LIMIT 10 OFFSET (greatest(_page,1)-1)*10)
SELECT jsonb_build_object('total',(SELECT count(*) FROM combined),'entries',coalesce((SELECT jsonb_agg(entry) FROM paged),'[]'::jsonb)); $$;
REVOKE ALL ON FUNCTION public.get_dealer_manager_history_range(text,integer,text,date,date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_dealer_manager_history_range(text,integer,text,date,date) TO authenticated;
CREATE INDEX IF NOT EXISTS proposals_created_at_idx ON public.proposals(created_at DESC);
CREATE OR REPLACE FUNCTION public.get_admin_dashboard(_year integer DEFAULT extract(year from now() AT TIME ZONE 'America/Sao_Paulo')::integer, _top_sellers integer DEFAULT 20)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path TO 'public' AS $$
DECLARE activity jsonb;
BEGIN
IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Acesso restrito à administração' USING ERRCODE='42501'; END IF;
IF _year < 2000 OR _year > 2100 THEN RAISE EXCEPTION 'Ano inválido'; END IF;
WITH proposal_totals AS (
SELECT p.id, extract(month from p.created_at AT TIME ZONE 'America/Sao_Paulo')::integer mes, coalesce(sum(pi.credit_value*pi.quantity),0) credit
FROM public.proposals p LEFT JOIN public.proposal_items pi ON pi.proposal_id=p.id
WHERE p.created_at >= (make_date(_year,1,1)::timestamp AT TIME ZONE 'America/Sao_Paulo') AND p.created_at < (make_date(_year+1,1,1)::timestamp AT TIME ZONE 'America/Sao_Paulo') GROUP BY p.id,p.created_at
), monthly AS (
SELECT m.mes,count(pt.id) total,avg(pt.credit) ticket_medio FROM generate_series(1,12) m(mes) LEFT JOIN proposal_totals pt ON pt.mes=m.mes GROUP BY m.mes
), seller_volume AS (
SELECT s.seller_id,coalesce(pr.name,'—') name,count(*) total FROM public.simulations s LEFT JOIN public.profiles pr ON pr.id=s.seller_id
WHERE s.created_at >= (make_date(_year,1,1)::timestamp AT TIME ZONE 'America/Sao_Paulo') AND s.created_at < (make_date(_year+1,1,1)::timestamp AT TIME ZONE 'America/Sao_Paulo') GROUP BY s.seller_id,pr.name ORDER BY total DESC,s.seller_id LIMIT least(greatest(_top_sellers,1),100)
)
SELECT jsonb_build_object('ano',_year,'propostas_ano',(SELECT count(*) FROM proposal_totals),'ticket_medio',(SELECT avg(credit) FROM proposal_totals),'credito_proposto',(SELECT sum(credit) FROM proposal_totals),'propostas_mensais',(SELECT jsonb_agg(jsonb_build_object('mes',mes,'total',total,'ticket_medio',ticket_medio) ORDER BY mes) FROM monthly),'volume_vendedores',coalesce((SELECT jsonb_agg(jsonb_build_object('name',name,'total',total) ORDER BY total DESC,seller_id) FROM seller_volume),'[]'::jsonb)) INTO activity;
RETURN public.get_admin_overview(least(greatest(_top_sellers,1),100)) || activity;
END; $$;
REVOKE ALL ON FUNCTION public.get_admin_dashboard(integer,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard(integer,integer) TO authenticated;
COMMENT ON FUNCTION public.get_admin_dashboard(integer,integer) IS 'Admin-only bounded summary: proposal headers counted once; average total credit including quantities per proposal; simulation volume counts saved simulation rows.';
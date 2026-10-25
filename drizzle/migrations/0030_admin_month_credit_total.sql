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
), month_credit AS (
SELECT coalesce(sum(pi.credit_value*pi.quantity),0) credit
FROM public.proposals p LEFT JOIN public.proposal_items pi ON pi.proposal_id=p.id
WHERE date_trunc('month', p.created_at AT TIME ZONE 'America/Sao_Paulo') = date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo')
)
SELECT jsonb_build_object('ano',_year,'propostas_ano',(SELECT count(*) FROM proposal_totals),'ticket_medio',(SELECT avg(credit) FROM proposal_totals),'credito_proposto',(SELECT sum(credit) FROM proposal_totals),'credito_proposto_mes',(SELECT credit FROM month_credit),'propostas_mensais',(SELECT jsonb_agg(jsonb_build_object('mes',mes,'total',total,'ticket_medio',ticket_medio) ORDER BY mes) FROM monthly),'volume_vendedores',coalesce((SELECT jsonb_agg(jsonb_build_object('name',name,'total',total) ORDER BY total DESC,seller_id) FROM seller_volume),'[]'::jsonb)) INTO activity;
RETURN public.get_admin_overview(least(greatest(_top_sellers,1),100)) || activity;
END; $$;
REVOKE ALL ON FUNCTION public.get_admin_dashboard(integer,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard(integer,integer) TO authenticated;
COMMENT ON FUNCTION public.get_admin_dashboard(integer,integer) IS 'Admin-only bounded summary: proposal headers counted once; average total credit including quantities per proposal; simulation volume counts saved simulation rows; credito_proposto_mes sums credit times quantity for proposals created in the current Sao Paulo month.';
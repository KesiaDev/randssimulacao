CREATE TABLE public.dealer_managers (
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 dealer_id uuid NOT NULL REFERENCES public.dealers(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,dealer_id)
);
GRANT SELECT,INSERT,UPDATE,DELETE ON public.dealer_managers TO authenticated;
GRANT ALL ON public.dealer_managers TO service_role;
ALTER TABLE public.dealer_managers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Managers read own assignments" ON public.dealer_managers FOR SELECT TO authenticated USING(user_id=auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage manager assignments" ON public.dealer_managers FOR ALL TO authenticated USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));
CREATE FUNCTION public.managed_dealer_ids() RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT dm.dealer_id FROM public.dealer_managers dm JOIN public.profiles p ON p.id=dm.user_id WHERE dm.user_id=auth.uid() AND p.active
$$;
REVOKE ALL ON FUNCTION public.managed_dealer_ids() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.managed_dealer_ids() TO authenticated,service_role;
CREATE FUNCTION public.manager_can_read_seller(_seller_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=_seller_id AND p.dealer_id IN(SELECT public.managed_dealer_ids()) AND NOT EXISTS(SELECT 1 FROM public.seller_dealers sd WHERE sd.seller_id=p.id AND sd.dealer_id<>p.dealer_id))
$$;
REVOKE ALL ON FUNCTION public.manager_can_read_seller(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.manager_can_read_seller(uuid) TO authenticated,service_role;
CREATE FUNCTION public.manager_can_read_revenda(_revenda text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM public.dealers d WHERE d.id IN(SELECT public.managed_dealer_ids()) AND lower(trim(d.name))=lower(trim(_revenda)))
$$;
REVOKE ALL ON FUNCTION public.manager_can_read_revenda(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.manager_can_read_revenda(text) TO authenticated,service_role;
CREATE FUNCTION public.protect_profile_dealer_membership() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(),'admin') AND (NEW.dealer_id IS DISTINCT FROM OLD.dealer_id OR NEW.active IS DISTINCT FROM OLD.active) THEN
  RAISE EXCEPTION 'Somente a administração pode alterar vínculos ou ativação diretamente.';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER protect_profile_dealer_membership BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.protect_profile_dealer_membership();
CREATE POLICY "Managers read dealer proposals" ON public.proposals FOR SELECT TO authenticated USING(public.manager_can_read_seller(seller_id));
CREATE POLICY "Managers read dealer simulations" ON public.simulations FOR SELECT TO authenticated USING(public.manager_can_read_seller(seller_id));
CREATE POLICY "Managers read dealer proposal items" ON public.proposal_items FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.proposals p WHERE p.id=proposal_id AND public.manager_can_read_seller(p.seller_id)));
CREATE POLICY "Managers read dealer annual targets" ON public.mauricio_metas_anuais FOR SELECT TO authenticated USING(public.manager_can_read_revenda(revenda));
CREATE POLICY "Managers read dealer monthly results" ON public.mauricio_resultados_mensais FOR SELECT TO authenticated USING(public.manager_can_read_revenda(revenda));
CREATE POLICY "Managers read dealer reservations" ON public.mauricio_reservas FOR SELECT TO authenticated USING(public.manager_can_read_revenda(revenda));
CREATE POLICY "Managers read dealer visits" ON public.mauricio_eventos FOR SELECT TO authenticated USING(public.manager_can_read_revenda(revenda));
CREATE FUNCTION public.get_dealer_manager_context() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',d.id,'name',d.name)),'[]'::jsonb) FROM public.dealers d WHERE d.id IN(SELECT public.managed_dealer_ids())
$$;
REVOKE ALL ON FUNCTION public.get_dealer_manager_context() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_dealer_manager_context() TO authenticated,service_role;
CREATE FUNCTION public.get_dealer_manager_team(_page integer DEFAULT 1) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 WITH scoped AS(SELECT p.id,p.name,p.email,p.phone,p.active,d.name AS dealer FROM public.profiles p JOIN public.dealers d ON d.id=p.dealer_id WHERE public.manager_can_read_seller(p.id)), paged AS(SELECT * FROM scoped ORDER BY name,id LIMIT 20 OFFSET (greatest(_page,1)-1)*20)
 SELECT jsonb_build_object('total',(SELECT count(*) FROM scoped),'entries',coalesce((SELECT jsonb_agg(to_jsonb(paged)) FROM paged),'[]'::jsonb))
$$;
REVOKE ALL ON FUNCTION public.get_dealer_manager_team(integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_dealer_manager_team(integer) TO authenticated,service_role;
CREATE FUNCTION public.get_dealer_manager_history(_page integer DEFAULT 1,_client text DEFAULT '',_seller text DEFAULT '',_date date DEFAULT NULL,_group text DEFAULT '',_credit text DEFAULT '') RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 WITH proposal_rows AS (
 SELECT p.id,p.created_at,jsonb_build_object('kind','proposal','id',p.id,'seller_id',p.seller_id,'seller_name',pr.name,'client_name',p.client_name,'created_at',p.created_at,'items',jsonb_agg(jsonb_build_object('quantity',pi.quantity,'group_code',pi.group_code,'credit_value',pi.credit_value,'final_amount',pi.final_amount,'simulation_id',pi.simulation_id,'contract_modality',pi.contract_modality) ORDER BY pi.sort_order)) entry
 FROM public.proposals p JOIN public.profiles pr ON pr.id=p.seller_id JOIN public.proposal_items pi ON pi.proposal_id=p.id
 WHERE public.manager_can_read_seller(p.seller_id)
 AND (coalesce(trim(_client),'')='' OR strpos(lower(coalesce(p.client_name,'')),lower(trim(_client)))>0)
 AND (coalesce(trim(_seller),'')='' OR strpos(lower(pr.name),lower(trim(_seller)))>0)
 AND (_date IS NULL OR (p.created_at AT TIME ZONE 'America/Sao_Paulo')::date=_date)
 AND (coalesce(trim(_group),'')='' OR EXISTS(SELECT 1 FROM public.proposal_items f WHERE f.proposal_id=p.id AND f.group_code=trim(_group)))
 AND (coalesce(trim(_credit),'')='' OR EXISTS(SELECT 1 FROM public.proposal_items f WHERE f.proposal_id=p.id AND regexp_replace(f.credit_value::text,'\D','','g') LIKE '%'||regexp_replace(_credit,'\D','','g')||'%'))
 GROUP BY p.id,p.created_at,p.seller_id,p.client_name,pr.name
 ), legacy_rows AS (
 SELECT s.id,s.created_at,jsonb_build_object('kind','simulation','id',s.id,'seller_id',s.seller_id,'seller_name',pr.name,'client_name',s.client_name,'created_at',s.created_at,'group_code',s.group_code,'credit_value',s.credit_value,'administration_rate',s.administration_rate,'installment_type_name',s.installment_type_name,'insurance_included',s.insurance_included,'final_amount',s.final_amount,'contract_modality',s.contract_modality) entry
 FROM public.simulations s JOIN public.profiles pr ON pr.id=s.seller_id WHERE public.manager_can_read_seller(s.seller_id)
 AND NOT EXISTS(SELECT 1 FROM public.proposal_items pi WHERE pi.simulation_id=s.id)
 AND (coalesce(trim(_client),'')='' OR strpos(lower(coalesce(s.client_name,'')),lower(trim(_client)))>0)
 AND (coalesce(trim(_seller),'')='' OR strpos(lower(pr.name),lower(trim(_seller)))>0)
 AND (_date IS NULL OR (s.created_at AT TIME ZONE 'America/Sao_Paulo')::date=_date)
 AND (coalesce(trim(_group),'')='' OR s.group_code=trim(_group))
 AND (coalesce(trim(_credit),'')='' OR regexp_replace(s.credit_value::text,'\D','','g') LIKE '%'||regexp_replace(_credit,'\D','','g')||'%')
 ), combined AS(SELECT * FROM proposal_rows UNION ALL SELECT * FROM legacy_rows), paged AS(SELECT entry FROM combined ORDER BY created_at DESC,id DESC LIMIT 10 OFFSET (greatest(_page,1)-1)*10)
 SELECT jsonb_build_object('total',(SELECT count(*) FROM combined),'entries',coalesce((SELECT jsonb_agg(entry) FROM paged),'[]'::jsonb))
$$;
REVOKE ALL ON FUNCTION public.get_dealer_manager_history(integer,text,text,date,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_dealer_manager_history(integer,text,text,date,text,text) TO authenticated,service_role;
CREATE FUNCTION public.get_dealer_manager_seller_contact(_seller_id uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT jsonb_build_object('name',p.name,'email',p.email,'phone',p.phone) FROM public.profiles p WHERE p.id=_seller_id AND public.manager_can_read_seller(p.id)
$$;
REVOKE ALL ON FUNCTION public.get_dealer_manager_seller_contact(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_dealer_manager_seller_contact(uuid) TO authenticated,service_role;
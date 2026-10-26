CREATE TABLE public.commercial_consultants (
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 dealer_id uuid NOT NULL REFERENCES public.dealers(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,dealer_id)
);
GRANT SELECT,INSERT,UPDATE,DELETE ON public.commercial_consultants TO authenticated;
GRANT ALL ON public.commercial_consultants TO service_role;
ALTER TABLE public.commercial_consultants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Consultants read own assignments" ON public.commercial_consultants FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE POLICY "Admins manage consultant assignments" ON public.commercial_consultants FOR ALL TO authenticated USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));
CREATE FUNCTION public.consultant_can_access_revenda(_revenda text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM public.commercial_consultants c JOIN public.dealers d ON d.id=c.dealer_id JOIN public.profiles p ON p.id=c.user_id WHERE c.user_id=auth.uid() AND p.active AND d.active AND lower(trim(d.name))=lower(trim(_revenda)))
$$;
REVOKE ALL ON FUNCTION public.consultant_can_access_revenda(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consultant_can_access_revenda(text) TO authenticated,service_role;
CREATE FUNCTION public.get_commercial_consultant_context() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',d.id,'name',d.name) ORDER BY d.name),'[]'::jsonb) FROM public.commercial_consultants c JOIN public.dealers d ON d.id=c.dealer_id JOIN public.profiles p ON p.id=c.user_id WHERE c.user_id=auth.uid() AND p.active AND d.active
$$;
REVOKE ALL ON FUNCTION public.get_commercial_consultant_context() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_commercial_consultant_context() TO authenticated,service_role;
CREATE POLICY "Consultants read assigned targets" ON public.mauricio_metas_anuais FOR SELECT TO authenticated USING(public.consultant_can_access_revenda(revenda));
CREATE POLICY "Consultants read assigned monthly results" ON public.mauricio_resultados_mensais FOR SELECT TO authenticated USING(public.consultant_can_access_revenda(revenda));
CREATE POLICY "Consultants insert current monthly results" ON public.mauricio_resultados_mensais FOR INSERT TO authenticated WITH CHECK(ano=extract(year from now() AT TIME ZONE 'America/Sao_Paulo')::integer AND public.consultant_can_access_revenda(revenda));
CREATE POLICY "Consultants update current monthly results" ON public.mauricio_resultados_mensais FOR UPDATE TO authenticated USING(ano=extract(year from now() AT TIME ZONE 'America/Sao_Paulo')::integer AND public.consultant_can_access_revenda(revenda)) WITH CHECK(ano=extract(year from now() AT TIME ZONE 'America/Sao_Paulo')::integer AND public.consultant_can_access_revenda(revenda));
CREATE POLICY "Consultants manage assigned reservations" ON public.mauricio_reservas FOR ALL TO authenticated USING(public.consultant_can_access_revenda(revenda)) WITH CHECK(public.consultant_can_access_revenda(revenda));
CREATE POLICY "Consultants manage assigned visits" ON public.mauricio_eventos FOR ALL TO authenticated USING(public.consultant_can_access_revenda(revenda)) WITH CHECK(public.consultant_can_access_revenda(revenda));
CREATE POLICY "Consultants manage own appointment reads" ON public.mauricio_evento_leituras FOR ALL TO authenticated USING(user_id=auth.uid() AND EXISTS(SELECT 1 FROM public.mauricio_eventos e WHERE e.id=evento_id AND public.consultant_can_access_revenda(e.revenda))) WITH CHECK(user_id=auth.uid() AND EXISTS(SELECT 1 FROM public.mauricio_eventos e WHERE e.id=evento_id AND public.consultant_can_access_revenda(e.revenda)));

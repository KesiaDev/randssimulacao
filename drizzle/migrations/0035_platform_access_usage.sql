CREATE TABLE public.platform_access_days (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  access_date date NOT NULL,
  access_count integer NOT NULL DEFAULT 0,
  last_access_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, access_date)
);
GRANT SELECT ON public.platform_access_days TO authenticated;
GRANT ALL ON public.platform_access_days TO service_role;
ALTER TABLE public.platform_access_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read access days" ON public.platform_access_days FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.log_platform_access()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL OR NOT EXISTS (SELECT 1 FROM profiles WHERE id = _uid) THEN RETURN; END IF;
  INSERT INTO platform_access_days (user_id, access_date, access_count, last_access_at)
  VALUES (_uid, (now() AT TIME ZONE 'America/Sao_Paulo')::date, 1, now())
  ON CONFLICT (user_id, access_date) DO UPDATE
    SET access_count = platform_access_days.access_count + 1, last_access_at = now();
END $$;
REVOKE ALL ON FUNCTION public.log_platform_access() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_platform_access() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_seller_usage(_from date, _to date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _days integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _from IS NULL OR _to IS NULL OR _to < _from OR _to - _from > 366 THEN RAISE EXCEPTION 'invalid range'; END IF;
  _days := (_to - _from) + 1;
  RETURN COALESCE((SELECT jsonb_agg(row_to_json(t) ORDER BY t.simulations DESC, t.accesses DESC, t.name) FROM (
    SELECT p.id, p.name, d.name AS dealer,
      COALESCE(a.accesses, 0) AS accesses,
      COALESCE(a.active_days, 0) AS active_days,
      COALESCE(s.n, 0) + COALESCE(pr.n, 0) AS simulations,
      COALESCE(pr.n, 0) AS proposals,
      a.last_access_at,
      _days AS period_days
    FROM profiles p
    JOIN user_roles r ON r.user_id = p.id AND r.role = 'seller'
    LEFT JOIN dealers d ON d.id = p.dealer_id
    LEFT JOIN (SELECT user_id, sum(access_count)::int accesses, count(*)::int active_days, max(last_access_at) last_access_at
               FROM platform_access_days WHERE access_date BETWEEN _from AND _to GROUP BY user_id) a ON a.user_id = p.id
    LEFT JOIN (SELECT seller_id, count(*)::int n FROM simulations
               WHERE (created_at AT TIME ZONE 'America/Sao_Paulo')::date BETWEEN _from AND _to GROUP BY seller_id) s ON s.seller_id = p.id
    LEFT JOIN (SELECT seller_id, count(*)::int n FROM proposals
               WHERE (created_at AT TIME ZONE 'America/Sao_Paulo')::date BETWEEN _from AND _to GROUP BY seller_id) pr ON pr.seller_id = p.id
    WHERE p.active
  ) t), '[]'::jsonb);
END $$;
REVOKE ALL ON FUNCTION public.get_seller_usage(date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_seller_usage(date, date) TO authenticated;
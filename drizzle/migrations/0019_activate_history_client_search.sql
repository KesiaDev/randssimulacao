DO $migration$
DECLARE definition text;
BEGIN
SELECT pg_get_functiondef('public.get_history_page(integer,integer,text,text,date,text)'::regprocedure) INTO definition;
definition := replace(definition, 'get_history_page(_page integer', 'get_history_page(_client text, _page integer');
definition := replace(definition, 'WHERE (NULLIF(trim(_seller)', 'WHERE (NULLIF(trim(_client), '''') IS NULL OR strpos(lower(COALESCE(p.client_name, '''')), lower(trim(_client))) > 0) AND (NULLIF(trim(_seller)');
definition := replace(definition, 'WHERE NOT EXISTS (', 'WHERE (NULLIF(trim(_client), '''') IS NULL OR strpos(lower(COALESCE(s.client_name, '''')), lower(trim(_client))) > 0) AND NOT EXISTS (');
definition := replace(definition, 'p.created_at::date', '(p.created_at AT TIME ZONE ''America/Sao_Paulo'')::date');
definition := replace(definition, 's.created_at::date', '(s.created_at AT TIME ZONE ''America/Sao_Paulo'')::date');
EXECUTE definition;
END;
$migration$;
REVOKE ALL ON FUNCTION public.get_history_page(text,integer,integer,text,text,date,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_history_page(text,integer,integer,text,text,date,text) TO authenticated, service_role;
NOTIFY pgrst, 'reload schema';
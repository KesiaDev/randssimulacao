-- Índice para consultas administrativas por data (contagens "hoje"/"mês" e
-- ordenação das últimas simulações) sem depender do índice composto por vendedor.
CREATE INDEX IF NOT EXISTS simulations_created_at_idx ON public.simulations (created_at DESC);

-- Agrega o painel administrativo inteiramente no banco: antes, admin.index.tsx
-- baixava a tabela `simulations` completa pro navegador e somava em JS a cada
-- carregamento da página. Isso cresce sem limite com o tempo de uso (mesmo com
-- poucos vendedores) e não escala. Aqui o Postgres soma e devolve só o resultado.
--
-- "por_vendedor" e "por_credito" são escopados ao mês atual (não all-time):
-- além de manter o custo da consulta previsível conforme o histórico cresce
-- por anos, um ranking do mês é mais útil operacionalmente do que um
-- acumulado histórico que nunca reseta.
CREATE OR REPLACE FUNCTION public.get_admin_overview(_top_sellers integer DEFAULT 20)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH month_scope AS (
    SELECT s.seller_id, s.credit_value, s.created_at
    FROM public.simulations s
    WHERE date_trunc('month', s.created_at AT TIME ZONE 'America/Sao_Paulo')
        = date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo')
  ),
  seller_totals AS (
    SELECT ms.seller_id, COALESCE(pr.name, pr.email, '—') AS seller_name, count(*) AS total
    FROM month_scope ms
    LEFT JOIN public.profiles pr ON pr.id = ms.seller_id
    GROUP BY ms.seller_id, COALESCE(pr.name, pr.email, '—')
    ORDER BY total DESC
    LIMIT GREATEST(_top_sellers, 1)
  ),
  credit_totals AS (
    SELECT credit_value, count(*) AS total
    FROM month_scope
    GROUP BY credit_value
    ORDER BY credit_value
  ),
  last_sims AS (
    SELECT s.id, s.created_at, COALESCE(pr.name, pr.email, '—') AS seller_name,
           s.group_code, s.credit_value, s.final_amount
    FROM public.simulations s
    LEFT JOIN public.profiles pr ON pr.id = s.seller_id
    ORDER BY s.created_at DESC
    LIMIT 10
  )
  SELECT jsonb_build_object(
    'total_vendedores', (SELECT count(*) FROM public.profiles),
    'vendedores_ativos', (SELECT count(*) FROM public.profiles WHERE active),
    'grupos_ativos', (SELECT count(*) FROM public.groups WHERE active),
    'simulacoes_hoje', (
      SELECT count(*) FROM public.simulations
      WHERE (created_at AT TIME ZONE 'America/Sao_Paulo')::date
          = (now() AT TIME ZONE 'America/Sao_Paulo')::date
    ),
    'simulacoes_mes', (SELECT count(*) FROM month_scope),
    'por_vendedor', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('name', seller_name, 'total', total)) FROM seller_totals),
      '[]'::jsonb
    ),
    'por_credito', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('credit_value', credit_value, 'total', total)) FROM credit_totals),
      '[]'::jsonb
    ),
    'ultimas', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'id', id, 'created_at', created_at, 'seller_name', seller_name,
        'group_code', group_code, 'credit_value', credit_value, 'final_amount', final_amount
      )) FROM last_sims),
      '[]'::jsonb
    )
  );
$$;

REVOKE ALL ON FUNCTION public.get_admin_overview(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_overview(integer) TO authenticated;

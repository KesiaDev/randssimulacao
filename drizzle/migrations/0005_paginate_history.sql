CREATE OR REPLACE FUNCTION public.get_history_page(
  _page integer DEFAULT 1,
  _page_size integer DEFAULT 10,
  _group text DEFAULT NULL,
  _seller text DEFAULT NULL,
  _date date DEFAULT NULL,
  _credit text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH proposal_rows AS (
    SELECT
      p.id,
      p.created_at,
      jsonb_build_object(
        'kind', 'proposal',
        'id', p.id,
        'seller_id', p.seller_id,
        'seller_name', COALESCE(pr.name, pr.email, '—'),
        'client_name', p.client_name,
        'created_at', p.created_at,
        'items', COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'quantity', pi.quantity,
              'group_code', pi.group_code,
              'credit_value', pi.credit_value,
              'final_amount', pi.final_amount,
              'simulation_id', pi.simulation_id
            ) ORDER BY pi.sort_order
          ),
          '[]'::jsonb
        )
      ) AS entry
    FROM public.proposals p
    LEFT JOIN public.profiles pr ON pr.id = p.seller_id
    JOIN public.proposal_items pi ON pi.proposal_id = p.id
    WHERE (NULLIF(trim(_seller), '') IS NULL OR COALESCE(pr.name, pr.email, '') ILIKE '%' || trim(_seller) || '%')
      AND (_date IS NULL OR p.created_at::date = _date)
      AND (NULLIF(trim(_group), '') IS NULL OR EXISTS (
        SELECT 1 FROM public.proposal_items fpi
        WHERE fpi.proposal_id = p.id AND fpi.group_code = trim(_group)
      ))
      AND (NULLIF(regexp_replace(COALESCE(_credit, ''), '\D', '', 'g'), '') IS NULL OR EXISTS (
        SELECT 1 FROM public.proposal_items fpi
        WHERE fpi.proposal_id = p.id
          AND regexp_replace(fpi.credit_value::text, '\D', '', 'g') LIKE '%' || regexp_replace(_credit, '\D', '', 'g') || '%'
      ))
    GROUP BY p.id, p.created_at, p.seller_id, p.client_name, pr.name, pr.email
  ),
  legacy_rows AS (
    SELECT
      s.id,
      s.created_at,
      jsonb_build_object(
        'kind', 'simulation',
        'id', s.id,
        'seller_id', s.seller_id,
        'seller_name', COALESCE(pr.name, pr.email, '—'),
        'client_name', s.client_name,
        'created_at', s.created_at,
        'group_code', s.group_code,
        'credit_value', s.credit_value,
        'administration_rate', s.administration_rate,
        'installment_type_name', s.installment_type_name,
        'insurance_included', s.insurance_included,
        'final_amount', s.final_amount
      ) AS entry
    FROM public.simulations s
    LEFT JOIN public.profiles pr ON pr.id = s.seller_id
    WHERE NOT EXISTS (
      SELECT 1 FROM public.proposal_items pi WHERE pi.simulation_id = s.id
    )
      AND (NULLIF(trim(_seller), '') IS NULL OR COALESCE(pr.name, pr.email, '') ILIKE '%' || trim(_seller) || '%')
      AND (_date IS NULL OR s.created_at::date = _date)
      AND (NULLIF(trim(_group), '') IS NULL OR s.group_code = trim(_group))
      AND (NULLIF(regexp_replace(COALESCE(_credit, ''), '\D', '', 'g'), '') IS NULL OR regexp_replace(s.credit_value::text, '\D', '', 'g') LIKE '%' || regexp_replace(_credit, '\D', '', 'g') || '%')
  ),
  combined AS (
    SELECT * FROM proposal_rows
    UNION ALL
    SELECT * FROM legacy_rows
  ),
  page_rows AS (
    SELECT entry
    FROM combined
    ORDER BY created_at DESC, id DESC
    LIMIT LEAST(GREATEST(_page_size, 1), 50)
    OFFSET (GREATEST(_page, 1) - 1) * LEAST(GREATEST(_page_size, 1), 50)
  )
  SELECT jsonb_build_object(
    'total', (SELECT count(*) FROM combined),
    'entries', COALESCE((SELECT jsonb_agg(entry) FROM page_rows), '[]'::jsonb)
  );
$$;

REVOKE ALL ON FUNCTION public.get_history_page(integer, integer, text, text, date, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_history_page(integer, integer, text, text, date, text) TO authenticated;
ALTER TABLE public.proposal_items
  ADD COLUMN IF NOT EXISTS lance_embedded_rate numeric(10,6),
  ADD COLUMN IF NOT EXISTS lance_cash_rate numeric(10,6);

COMMENT ON COLUMN public.proposal_items.lance_embedded_rate IS 'Percentual de lance embutido salvo pelo vendedor (decimal). Nulo = nenhuma simulação salva.';

COMMENT ON COLUMN public.proposal_items.lance_cash_rate IS 'Percentual de lance em espécie salvo pelo vendedor (decimal). Nulo = nenhuma simulação salva.';
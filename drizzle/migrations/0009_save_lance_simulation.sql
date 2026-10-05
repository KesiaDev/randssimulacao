-- Permite salvar a simulação de lance escolhida pelo vendedor em cada item
-- da proposta. Guardamos só os dois percentuais de entrada (não os valores
-- calculados) para recalcular sempre com a fórmula atual, sem risco de
-- ficar com número desatualizado se a fórmula for ajustada depois.
ALTER TABLE public.proposal_items
  ADD COLUMN lance_embedded_rate numeric(10,6),
  ADD COLUMN lance_cash_rate numeric(10,6);

COMMENT ON COLUMN public.proposal_items.lance_embedded_rate IS 'Percentual de lance embutido salvo pelo vendedor (decimal). Nulo = nenhuma simulação salva.';
COMMENT ON COLUMN public.proposal_items.lance_cash_rate IS 'Percentual de lance em espécie salvo pelo vendedor (decimal). Nulo = nenhuma simulação salva.';

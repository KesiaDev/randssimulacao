-- Modalidade da simulação de lance salva no item da proposta (Reduzir prazo / Reduzir parcela).
-- Não destrutiva: NULL em lances antigos significa Reduzir parcela, a regra com que foram calculados.
ALTER TABLE public.proposal_items
  ADD COLUMN IF NOT EXISTS lance_modality text;

DO $migration$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'proposal_items_lance_modality_check') THEN
    ALTER TABLE public.proposal_items
      ADD CONSTRAINT proposal_items_lance_modality_check
      CHECK (lance_modality IS NULL OR lance_modality IN ('reduzir_prazo', 'reduzir_parcela'));
  END IF;
END;
$migration$;

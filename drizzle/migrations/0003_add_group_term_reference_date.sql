ALTER TABLE public.groups
ADD COLUMN term_reference_date date NOT NULL DEFAULT CURRENT_DATE;

COMMENT ON COLUMN public.groups.term_reference_date IS 'Data-base usada para reduzir automaticamente o prazo restante a cada mês.';

CREATE OR REPLACE FUNCTION public.reset_group_term_reference_date()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.remaining_term IS DISTINCT FROM OLD.remaining_term THEN
    NEW.term_reference_date := CURRENT_DATE;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER reset_group_term_reference_date_on_remaining_term
BEFORE UPDATE OF remaining_term ON public.groups
FOR EACH ROW
EXECUTE FUNCTION public.reset_group_term_reference_date();
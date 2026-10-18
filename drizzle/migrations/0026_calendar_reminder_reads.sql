CREATE TABLE public.mauricio_evento_leituras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id uuid NOT NULL REFERENCES public.mauricio_eventos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  data_evento date NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('hoje', 'amanha')),
  lida_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (evento_id, user_id, data_evento, tipo)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mauricio_evento_leituras TO authenticated;
GRANT ALL ON public.mauricio_evento_leituras TO service_role;
ALTER TABLE public.mauricio_evento_leituras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Mauricio gerencia leitura de compromissos" ON public.mauricio_evento_leituras FOR ALL TO authenticated USING (auth.uid() = 'a6df6d4c-87c9-4349-b1af-0f55e2dc4bfd'::uuid AND user_id = auth.uid()) WITH CHECK (auth.uid() = 'a6df6d4c-87c9-4349-b1af-0f55e2dc4bfd'::uuid AND user_id = auth.uid());
CREATE INDEX mauricio_evento_leituras_data_idx ON public.mauricio_evento_leituras (data_evento, user_id);
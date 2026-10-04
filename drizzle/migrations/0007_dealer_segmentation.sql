-- Segmentação por revenda: cada vendedor pertence a uma revenda, e grupos
-- (ou taxas específicas dentro de um grupo) podem ser restritos a um
-- subconjunto de revendas. Quando um grupo/taxa não tem nenhuma linha em
-- group_dealers/administration_rate_dealers, ele continua visível pra todo
-- mundo (comportamento atual, sem regressão para o Grupo 920 etc.).
CREATE TABLE public.dealers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.dealers TO authenticated;
GRANT ALL ON public.dealers TO service_role;
ALTER TABLE public.dealers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dealers read" ON public.dealers FOR SELECT TO authenticated USING (true);
CREATE POLICY "dealers admin" ON public.dealers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.dealers (name) VALUES
  ('Baldessar'), ('Centro Oeste'), ('Compasi'), ('ICCAP'), ('Medianeira'),
  ('Megatec'), ('Multieixo'), ('Nordeste'), ('Venice'), ('Redemil'),
  ('Rodan'), ('Rodoap'), ('Rodocap'), ('Rodoeste'), ('Rodoparaíba'),
  ('Rodoparaná'), ('Rodorib'), ('Rodosergipe'), ('Sobre Rodas');

ALTER TABLE public.profiles ADD COLUMN dealer_id uuid REFERENCES public.dealers(id) ON DELETE SET NULL;

CREATE TABLE public.group_dealers (
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  dealer_id uuid NOT NULL REFERENCES public.dealers(id) ON DELETE CASCADE,
  PRIMARY KEY (group_id, dealer_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_dealers TO authenticated;
GRANT ALL ON public.group_dealers TO service_role;
ALTER TABLE public.group_dealers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "group_dealers read" ON public.group_dealers FOR SELECT TO authenticated USING (true);
CREATE POLICY "group_dealers admin" ON public.group_dealers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.administration_rate_dealers (
  administration_rate_id uuid NOT NULL REFERENCES public.administration_rates(id) ON DELETE CASCADE,
  dealer_id uuid NOT NULL REFERENCES public.dealers(id) ON DELETE CASCADE,
  PRIMARY KEY (administration_rate_id, dealer_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.administration_rate_dealers TO authenticated;
GRANT ALL ON public.administration_rate_dealers TO service_role;
ALTER TABLE public.administration_rate_dealers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "administration_rate_dealers read" ON public.administration_rate_dealers FOR SELECT TO authenticated USING (true);
CREATE POLICY "administration_rate_dealers admin" ON public.administration_rate_dealers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Restringe a leitura de groups/administration_rates pela revenda do vendedor,
-- preservando acesso total para admin e visibilidade padrão (sem restrição
-- cadastrada = visível pra todos).
DROP POLICY IF EXISTS "groups read" ON public.groups;
CREATE POLICY "groups read" ON public.groups FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin')
  OR NOT EXISTS (SELECT 1 FROM public.group_dealers gd WHERE gd.group_id = groups.id)
  OR EXISTS (
    SELECT 1 FROM public.group_dealers gd
    JOIN public.profiles pr ON pr.id = auth.uid()
    WHERE gd.group_id = groups.id AND gd.dealer_id = pr.dealer_id
  )
);

DROP POLICY IF EXISTS "administration_rates read" ON public.administration_rates;
CREATE POLICY "administration_rates read" ON public.administration_rates FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin')
  OR NOT EXISTS (SELECT 1 FROM public.administration_rate_dealers ard WHERE ard.administration_rate_id = administration_rates.id)
  OR EXISTS (
    SELECT 1 FROM public.administration_rate_dealers ard
    JOIN public.profiles pr ON pr.id = auth.uid()
    WHERE ard.administration_rate_id = administration_rates.id AND ard.dealer_id = pr.dealer_id
  )
);

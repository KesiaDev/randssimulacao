ALTER TABLE public.profiles
  ADD COLUMN cpf text,
  ADD COLUMN self_registered boolean NOT NULL DEFAULT false;

CREATE TABLE public.licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'canceled')),
  asaas_customer_id text,
  asaas_payment_id text,
  asaas_installment_id text,
  paid_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX licenses_seller_idx ON public.licenses (seller_id, created_at DESC);

GRANT SELECT ON public.licenses TO authenticated;
GRANT ALL ON public.licenses TO service_role;
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "licenses read" ON public.licenses FOR SELECT TO authenticated
  USING (seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.set_license_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER licenses_set_updated_at
BEFORE UPDATE ON public.licenses
FOR EACH ROW EXECUTE FUNCTION public.set_license_updated_at();

GRANT SELECT ON public.dealers TO anon;
CREATE POLICY "dealers read anon" ON public.dealers FOR SELECT TO anon USING (active);
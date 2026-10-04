-- Autocadastro de vendedor com licença anual paga via Asaas.
-- Vendedores cadastrados pelo admin (tela "Minha equipe") NUNCA ganham uma
-- linha em `licenses` e por isso nunca são bloqueados por isso — o gate de
-- acesso só vale pra profiles.self_registered = true.
ALTER TABLE public.profiles
  ADD COLUMN cpf text,
  ADD COLUMN self_registered boolean NOT NULL DEFAULT false;

CREATE TABLE public.licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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

-- Leitura: o próprio vendedor vê suas licenças, admin vê todas.
-- Sem política de INSERT/UPDATE/DELETE para `authenticated` de propósito —
-- só o service_role (servidor, nunca o navegador) pode mudar status/datas,
-- pra um vendedor não conseguir se autoativar direto pela API.
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

-- A tela pública de autocadastro (/cadastro) precisa listar as revendas
-- antes do vendedor ter qualquer sessão — libera leitura pra visitantes
-- anônimos também (só leitura, nada sensível nessa tabela).
CREATE POLICY "dealers read anon" ON public.dealers FOR SELECT TO anon USING (active);

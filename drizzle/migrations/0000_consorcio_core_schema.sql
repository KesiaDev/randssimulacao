-- ROLES ---------------------------------------------------------------
CREATE TYPE public.app_role AS ENUM ('admin', 'seller');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  name text NOT NULL DEFAULT '',
  email text NOT NULL,
  phone text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "profile update" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "roles read" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Bootstrap: cria/atualiza o perfil do usuario logado e concede papel
CREATE OR REPLACE FUNCTION public.ensure_profile(_name text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _email text := lower(coalesce(auth.jwt() ->> 'email', ''));
BEGIN
  IF _uid IS NULL THEN RETURN; END IF;

  INSERT INTO public.profiles (id, email, name)
  VALUES (_uid, _email, coalesce(nullif(_name, ''), split_part(_email, '@', 1)))
  ON CONFLICT (id) DO UPDATE SET email = excluded.email;

  IF _email = 'mauricio.palma@rands.com.br' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (_uid, 'admin')
    ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (_uid, 'seller')
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;

-- CONFIGURACAO DOS GRUPOS ---------------------------------------------
CREATE TABLE public.groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  description text,
  initial_term integer NOT NULL,
  remaining_term integer NOT NULL,
  reserve_fund numeric(10,6) NOT NULL DEFAULT 0.01,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.credit_ranges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  credit_value numeric(14,2) NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.administration_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  rate numeric(10,6) NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.installment_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  name text NOT NULL,
  multiplier numeric(10,6) NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.insurance_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Seguro prestamista',
  rate numeric(10,6) NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.simulations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL,
  client_name text,
  group_id uuid REFERENCES public.groups(id) ON DELETE SET NULL,
  credit_range_id uuid REFERENCES public.credit_ranges(id) ON DELETE SET NULL,
  administration_rate_id uuid REFERENCES public.administration_rates(id) ON DELETE SET NULL,
  installment_type_id uuid REFERENCES public.installment_types(id) ON DELETE SET NULL,
  group_code text NOT NULL,
  credit_value numeric(14,2) NOT NULL,
  administration_rate numeric(10,6) NOT NULL,
  reserve_fund numeric(10,6) NOT NULL,
  installment_type_name text NOT NULL,
  installment_multiplier numeric(10,6) NOT NULL,
  initial_term integer NOT NULL,
  remaining_term integer NOT NULL,
  insurance_included boolean NOT NULL DEFAULT false,
  insurance_rate numeric(10,6) NOT NULL DEFAULT 0,
  base_amount numeric(16,6) NOT NULL,
  installment_amount numeric(16,6) NOT NULL,
  insurance_amount numeric(16,6) NOT NULL DEFAULT 0,
  final_amount numeric(16,6) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX simulations_seller_idx ON public.simulations (seller_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.groups TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.credit_ranges TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.administration_rates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.installment_types TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.insurance_rules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.simulations TO authenticated;
GRANT ALL ON public.groups, public.credit_ranges, public.administration_rates,
  public.installment_types, public.insurance_rules, public.simulations TO service_role;

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_ranges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.administration_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "groups read" ON public.groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "groups admin" ON public.groups FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "credit_ranges read" ON public.credit_ranges FOR SELECT TO authenticated USING (true);
CREATE POLICY "credit_ranges admin" ON public.credit_ranges FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "administration_rates read" ON public.administration_rates FOR SELECT TO authenticated USING (true);
CREATE POLICY "administration_rates admin" ON public.administration_rates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "installment_types read" ON public.installment_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "installment_types admin" ON public.installment_types FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "insurance_rules read" ON public.insurance_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "insurance_rules admin" ON public.insurance_rules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "simulations read" ON public.simulations FOR SELECT TO authenticated
  USING (seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "simulations insert" ON public.simulations FOR INSERT TO authenticated
  WITH CHECK (seller_id = auth.uid());
CREATE POLICY "simulations delete" ON public.simulations FOR DELETE TO authenticated
  USING (seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- DADOS DO GRUPO 920 ---------------------------------------------------
INSERT INTO public.groups (name, code, description, initial_term, remaining_term, reserve_fund, active)
VALUES ('Grupo 920', '920', 'Grupo Randon Consorcios', 100, 41, 0.01, true);

INSERT INTO public.credit_ranges (group_id, credit_value)
SELECT g.id, v FROM public.groups g,
  (VALUES (293305.85),(269841.38),(246376.92),(222912.44),(199447.98),(175983.51),(146653.29)) AS t(v)
WHERE g.code = '920';

INSERT INTO public.administration_rates (group_id, rate)
SELECT g.id, v FROM public.groups g, (VALUES (0.10),(0.14)) AS t(v) WHERE g.code = '920';

INSERT INTO public.installment_types (group_id, name, multiplier)
SELECT g.id, t.n, t.m FROM public.groups g,
  (VALUES ('Parcela Integral', 1.0), ('Parcela Reduzida', 0.4)) AS t(n, m)
WHERE g.code = '920';

INSERT INTO public.insurance_rules (group_id, name, rate)
SELECT g.id, 'Seguro prestamista', 0.0004 FROM public.groups g WHERE g.code = '920';
create table public.mauricio_resultados_mensais (
  id uuid primary key default gen_random_uuid(),
  ano integer not null,
  mes integer not null check (mes between 1 and 12),
  revenda text not null,
  valor numeric,
  observacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (ano, mes, revenda)
);
grant select, insert, update, delete on public.mauricio_resultados_mensais to authenticated;
grant all on public.mauricio_resultados_mensais to service_role;
alter table public.mauricio_resultados_mensais enable row level security;
create policy "Somente Mauricio acessa resultados mensais" on public.mauricio_resultados_mensais for all to authenticated using (auth.uid() = 'a6df6d4c-87c9-4349-b1af-0f55e2dc4bfd') with check (auth.uid() = 'a6df6d4c-87c9-4349-b1af-0f55e2dc4bfd');

create table public.mauricio_metas_anuais (
  id uuid primary key default gen_random_uuid(),
  ano integer not null,
  revenda text not null,
  meta numeric,
  realizado numeric,
  observacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (ano, revenda)
);
grant select, insert, update, delete on public.mauricio_metas_anuais to authenticated;
grant all on public.mauricio_metas_anuais to service_role;
alter table public.mauricio_metas_anuais enable row level security;
create policy "Somente Mauricio acessa metas anuais" on public.mauricio_metas_anuais for all to authenticated using (auth.uid() = 'a6df6d4c-87c9-4349-b1af-0f55e2dc4bfd') with check (auth.uid() = 'a6df6d4c-87c9-4349-b1af-0f55e2dc4bfd');

create table public.mauricio_seguro (
  id uuid primary key default gen_random_uuid(),
  ano integer not null default 2026,
  revenda text not null,
  meta numeric,
  realizado numeric,
  observacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (ano, revenda)
);
grant select, insert, update, delete on public.mauricio_seguro to authenticated;
grant all on public.mauricio_seguro to service_role;
alter table public.mauricio_seguro enable row level security;
create policy "Somente Mauricio acessa seguro" on public.mauricio_seguro for all to authenticated using (auth.uid() = 'a6df6d4c-87c9-4349-b1af-0f55e2dc4bfd') with check (auth.uid() = 'a6df6d4c-87c9-4349-b1af-0f55e2dc4bfd');

create table public.mauricio_campanhas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  periodo text,
  meta numeric,
  realizado numeric,
  observacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.mauricio_campanhas to authenticated;
grant all on public.mauricio_campanhas to service_role;
alter table public.mauricio_campanhas enable row level security;
create policy "Somente Mauricio acessa campanhas" on public.mauricio_campanhas for all to authenticated using (auth.uid() = 'a6df6d4c-87c9-4349-b1af-0f55e2dc4bfd') with check (auth.uid() = 'a6df6d4c-87c9-4349-b1af-0f55e2dc4bfd');

create table public.mauricio_indicacao (
  id uuid primary key default gen_random_uuid(),
  grupo integer not null,
  cotas integer,
  credito_total numeric,
  taxa numeric,
  prazo integer,
  parcela_integral numeric,
  parcela_35 numeric,
  seguro numeric,
  parcela_final_integral numeric,
  parcela_final_35 numeric,
  bonus_cota numeric,
  bonus_total numeric,
  completo boolean not null default true,
  observacao text,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.mauricio_indicacao to authenticated;
grant all on public.mauricio_indicacao to service_role;
alter table public.mauricio_indicacao enable row level security;
create policy "Somente Mauricio acessa indicacao" on public.mauricio_indicacao for all to authenticated using (auth.uid() = 'a6df6d4c-87c9-4349-b1af-0f55e2dc4bfd') with check (auth.uid() = 'a6df6d4c-87c9-4349-b1af-0f55e2dc4bfd');

create table public.mauricio_eventos (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  data_fim date,
  titulo text not null,
  revenda text,
  cidade text,
  estado text,
  tipo text not null default 'visita',
  status text not null default 'confirmado',
  observacao text,
  logistica text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index mauricio_eventos_data_idx on public.mauricio_eventos (data);
grant select, insert, update, delete on public.mauricio_eventos to authenticated;
grant all on public.mauricio_eventos to service_role;
alter table public.mauricio_eventos enable row level security;
create policy "Somente Mauricio acessa eventos" on public.mauricio_eventos for all to authenticated using (auth.uid() = 'a6df6d4c-87c9-4349-b1af-0f55e2dc4bfd') with check (auth.uid() = 'a6df6d4c-87c9-4349-b1af-0f55e2dc4bfd');

create table public.mauricio_reservas (
  id uuid primary key default gen_random_uuid(),
  grupo integer not null,
  cota integer not null,
  vendedor text,
  revenda text not null,
  validade date not null,
  obs text,
  status text not null default 'ativa',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (grupo, cota, revenda)
);
create index mauricio_reservas_validade_idx on public.mauricio_reservas (validade);
create index mauricio_reservas_status_idx on public.mauricio_reservas (status);
grant select, insert, update, delete on public.mauricio_reservas to authenticated;
grant all on public.mauricio_reservas to service_role;
alter table public.mauricio_reservas enable row level security;
create policy "Somente Mauricio acessa reservas" on public.mauricio_reservas for all to authenticated using (auth.uid() = 'a6df6d4c-87c9-4349-b1af-0f55e2dc4bfd') with check (auth.uid() = 'a6df6d4c-87c9-4349-b1af-0f55e2dc4bfd');

create table public.mauricio_notificacoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  reserva_id uuid not null references public.mauricio_reservas(id) on delete cascade,
  tipo text not null check (tipo in ('vespera', 'vencimento')),
  mensagem text not null,
  lida boolean not null default false,
  created_at timestamptz not null default now(),
  lida_em timestamptz,
  unique (reserva_id, tipo)
);
create index mauricio_notificacoes_user_idx on public.mauricio_notificacoes (user_id, lida);
grant select, insert, update, delete on public.mauricio_notificacoes to authenticated;
grant all on public.mauricio_notificacoes to service_role;
alter table public.mauricio_notificacoes enable row level security;
create policy "Somente Mauricio acessa notificacoes" on public.mauricio_notificacoes for all to authenticated using (auth.uid() = 'a6df6d4c-87c9-4349-b1af-0f55e2dc4bfd' and user_id = auth.uid()) with check (auth.uid() = 'a6df6d4c-87c9-4349-b1af-0f55e2dc4bfd' and user_id = auth.uid());

insert into public.mauricio_resultados_mensais (ano, mes, revenda, valor) values
  (2026,1,'Compasi',1425126),(2026,2,'Compasi',200000),(2026,3,'Compasi',822912.44),(2026,4,'Compasi',0),(2026,5,'Compasi',3300000),(2026,6,'Compasi',5000000),(2026,7,'Compasi',4940000),(2026,8,'Compasi',1170000),(2026,9,'Compasi',15044264.40),
  (2026,1,'Rodoeste',1963620.72),(2026,2,'Rodoeste',18484659.82),(2026,3,'Rodoeste',12617100.28),(2026,4,'Rodoeste',3842867.85),(2026,5,'Rodoeste',26795446.40),(2026,6,'Rodoeste',13596265.52),(2026,7,'Rodoeste',1720000),(2026,8,'Rodoeste',29279130.76),(2026,9,'Rodoeste',3920149.16),(2026,10,'Rodoeste',622636.80),
  (2026,9,'Multieixo',35515169.27),(2026,10,'Multieixo',710128.89);

insert into public.mauricio_metas_anuais (ano, revenda, meta, realizado, observacao) values
  (2023,'Compasi',50760000,40343220,null),
  (2024,'Compasi',82500000,42519000,null),
  (2025,'Compasi',72139649,90617236.46,null),
  (2026,'Compasi',72139649,31902302.84,'Realizado 2026 = soma dos meses jan-set da planilha'),
  (2024,'Rodoeste',182160000,37029666.28,null),
  (2025,'Rodoeste',142624018.02,112113026.45,null),
  (2026,'Rodoeste',142624018.02,112841877.31,'Realizado 2026 = soma dos meses jan-out da planilha'),
  (2025,'Multieixo',310303850.40,341276295.75,null),
  (2026,'Multieixo',310303850.40,197339591.93,'Realizado 2026 conforme fórmula da planilha');

insert into public.mauricio_seguro (ano, revenda, meta, realizado, observacao) values
  (2026,'Rodoeste',86000000,42123872.80,'Realizado estimado: 37,33% do realizado 2026 (fórmula da planilha)'),
  (2026,'Compasi',15000000,15951151.42,'Realizado estimado: 50% do realizado 2026 (fórmula da planilha)');

insert into public.mauricio_campanhas (nome, periodo, meta, realizado, observacao) values
  ('Campanha comercial 2026','Jul-Dez/2026',159945978.63,92921479.28,'Realizado = soma jul-dez do total das revendas (fórmula da planilha)'),
  ('Campanha comercial 2026 — linha 2',null,44784874.02,49248384.02,'Meta = 28% e realizado = 53% da campanha principal (fórmulas da planilha)');

insert into public.mauricio_indicacao (grupo, cotas, credito_total, taxa, prazo, parcela_integral, parcela_35, seguro, parcela_final_integral, parcela_final_35, bonus_cota, bonus_total, completo, observacao) values
  (940,23,220000,0.125,82,3018.29,1056.40,99,3117.29,1155.40,1100,25300,true,'Bônus: 50% na 6ª e 50% na 10ª parcela'),
  (930,15,340000,0.125,75,5100,1785,153,5253,1938,1700,25500,true,'Bônus: 50% na 6ª e 50% na 10ª parcela'),
  (1081,10,500000,0.125,118,4766.95,1668.43,225,4991.95,1893.43,2500,25000,true,'Bônus: 50% na 6ª e 50% na 10ª parcela. Planilha indica "vezes 20" cotas (crédito total 10.000.000, bônus 50.000)'),
  (940,46,220000,0.105,null,null,null,null,null,null,null,null,false,'Segundo bloco da planilha com fórmulas quebradas (#REF!): prazo ausente na origem. Taxa de 10,5% conforme célula. Revisar com Maurício.');

insert into public.mauricio_eventos (data, titulo, revenda, tipo, status, logistica) values
  ('2026-01-05','Visita Rodoeste','Rodoeste','visita','confirmado','Voo ok, hotel ok - Edivaldo'),
  ('2026-02-03','Visita Compasi','Compasi','visita','confirmado','Carro ok, hotel reservado'),
  ('2026-02-16','Carnaval',null,'feriado','confirmado',null),
  ('2026-02-23','Compromisso (aéreo OK)',null,'visita','confirmado','Aereo OK'),
  ('2026-03-02','Superação',null,'evento','confirmado',null),
  ('2026-03-16','Treinamento Rodrigo na Rands',null,'evento','confirmado',null),
  ('2026-03-23','Show Safra — Rodoeste','Rodoeste','evento','confirmado','Hotel ok, aéreo Sinop OK > Lucas do Rio Verde'),
  ('2026-04-06','Visita Compasi','Compasi','visita','confirmado','Carro ok, Hotel Martello ok'),
  ('2026-04-20','Rodoeste — Norte Show','Rodoeste','evento','confirmado','Hotel e aéreo ok'),
  ('2026-05-04','Visita Compasi','Compasi','visita','confirmado','Compasi Alison'),
  ('2026-05-25','Visita Rodoeste','Rodoeste','visita','confirmado','Rondonópolis - Jackson'),
  ('2026-06-08','Férias',null,'folga','confirmado',null),
  ('2026-06-11','Feriado',null,'feriado','confirmado',null),
  ('2026-06-12','Folga',null,'folga','confirmado',null),
  ('2026-06-23','Visita Compasi','Compasi','visita','confirmado','Jantar grupo regional/Chapecó - Abimael, hotel e carro ok'),
  ('2026-07-20','Visita Compasi','Compasi','visita','confirmado','Compasi Josemar, hotel reservado'),
  ('2026-07-30','Visita Rodoeste — Copa Truck Cuiabá','Rodoeste','evento','confirmado','Cuiabá Copa Truck (aéreo e hotel Palace ok)'),
  ('2026-08-05','Convenção Comercial Rands',null,'evento','confirmado',null),
  ('2026-08-17','Visita Compasi','Compasi','visita','confirmado','Compasi Abimael, Mogano reservado, carro reservado'),
  ('2026-09-03','Deslocar',null,'pendencia','confirmado',null),
  ('2026-09-04','Pedir folga',null,'pendencia','confirmado',null),
  ('2026-09-07','Feriado',null,'feriado','confirmado',null),
  ('2026-09-21','Visita Rodoeste','Rodoeste','visita','confirmado','Carro reservado para a semana'),
  ('2026-09-24','Evento Compasi','Compasi','evento','confirmado','Carro reservado para a semana'),
  ('2026-09-30','Visita Rodoeste e Compasi','Rodoeste','visita','confirmado',null),
  ('2026-10-12','Visita Rodoeste','Rodoeste','visita','confirmado','Aéreo OK, hotéis booking'),
  ('2026-10-19','Visita Multieixo','Multieixo','visita','confirmado','Aéreos e hotel ok'),
  ('2026-10-29','Copa Truck — Compasi','Compasi','evento','confirmado','Compasi Copa Truck - carro ok, Seville ok, Mogano ok'),
  ('2026-11-09','Fenatran',null,'evento','confirmado','Aéreos ok'),
  ('2026-11-19','GTA',null,'evento','confirmado',null),
  ('2026-11-23','Visita Multieixo','Multieixo','visita','confirmado','Ir para Multieixo Guarulhos');

insert into public.mauricio_reservas (grupo, cota, vendedor, revenda, validade, obs) values
  (1051,1471,'Renan','Multieixo','2026-10-20',null),
  (1051,640,'Renan','Multieixo','2026-10-20',null),
  (1051,479,'Renan','Multieixo','2026-10-20',null),
  (1051,1419,'Alen','Multieixo','2026-10-20',null),
  (1061,1702,'Marlon','Multieixo','2026-10-21',null),
  (1051,867,'Renan','Multieixo','2026-10-22',null),
  (1051,3,'Alen','Multieixo','2026-10-23',null),
  (1011,88,'Tainan','Multieixo','2026-10-23',null),
  (1021,1118,null,'Rodoeste','2026-10-25',null),
  (1031,1283,'Thiago','Rodoeste','2026-10-25',null),
  (1061,1728,'Marlon','Multieixo','2026-10-26',null),
  (920,782,null,'Multieixo','2026-10-26','Passar Max'),
  (920,790,null,'Multieixo','2026-10-26','Passar Max'),
  (920,343,'Maicon','Rodoeste','2026-10-26',null),
  (1041,1047,'Renan','Multieixo','2027-08-23',null),
  (1041,1048,'Renan','Multieixo','2027-08-24',null),
  (1041,1082,null,'Multieixo','2027-08-25',null),
  (1041,1270,'Renan','Multieixo','2027-08-26',null),
  (1011,77,'Weldes','Multieixo','2027-08-27',null),
  (1011,83,'Weldes','Multieixo','2027-08-27',null),
  (1011,84,'Weldes','Multieixo','2027-08-27',null),
  (1011,85,'Weldes','Multieixo','2027-08-27',null),
  (1011,86,'Weldes','Multieixo','2027-08-27',null),
  (1001,350,'Renan','Multieixo','2027-09-25',null),
  (1001,453,'Renan','Multieixo','2027-09-25',null);
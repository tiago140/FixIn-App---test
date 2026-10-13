-- Portal do prestador — Etapas 2 e 3 (fotos, conclusão e aprovação, pagamentos, notas fiscais).
-- Rodar DEPOIS de prestador_portal_etapa1.sql. Só acrescenta; não altera nem apaga nada que já existe.

-- 1) Conclusão, revisão e link de fotos na ordem de serviço
alter table public.ordens_servico
  add column if not exists token_fotos text unique,
  add column if not exists token_expira timestamptz,
  add column if not exists rodada int not null default 0,
  add column if not exists concluido_em timestamptz,
  add column if not exists conclusao_obs text,
  add column if not exists revisado_em timestamptz,
  add column if not exists revisado_por uuid references public.profiles(id),
  add column if not exists reprovacao_motivo text;

-- 2) Fotos da execução (antes/depois) e da reprovação
create table if not exists public.os_fotos (
  id uuid primary key default gen_random_uuid(),
  os_id uuid not null references public.ordens_servico(id) on delete cascade,
  tipo text not null check (tipo in ('antes','depois','reprovacao')),
  rodada int not null default 0,
  path text not null,
  legenda text,
  origem text not null default 'prestador' check (origem in ('prestador','link','equipe')),
  criado_em timestamptz not null default now()
);
create index if not exists os_fotos_os_idx on public.os_fotos(os_id);

-- 3) Notas fiscais anexadas pelo prestador
create table if not exists public.os_notas (
  id uuid primary key default gen_random_uuid(),
  os_id uuid not null references public.ordens_servico(id) on delete cascade,
  numero text,
  valor numeric(12,2),
  path text not null,
  nome_arquivo text,
  criado_em timestamptz not null default now()
);
create index if not exists os_notas_os_idx on public.os_notas(os_id);

-- 4) Pagamentos feitos ao prestador (com comprovante)
create table if not exists public.pagamentos_prestador (
  id uuid primary key default gen_random_uuid(),
  os_id uuid not null references public.ordens_servico(id) on delete cascade,
  prestador_id uuid not null references public.prestadores(id),
  valor numeric(12,2) not null check (valor > 0),
  data_pagamento date not null,
  forma text,
  observacao text,
  comprovante_path text,
  criado_por uuid references public.profiles(id),
  criado_em timestamptz not null default now()
);
create index if not exists pagprest_os_idx on public.pagamentos_prestador(os_id);
create index if not exists pagprest_prest_idx on public.pagamentos_prestador(prestador_id);

alter table public.os_fotos enable row level security;
alter table public.os_notas enable row level security;
alter table public.pagamentos_prestador enable row level security;

-- leitura: equipe FixIn tudo; prestador só o que é dele. Escrita só pelo servidor (service role).
drop policy if exists os_fotos_select on public.os_fotos;
create policy os_fotos_select on public.os_fotos for select using (
  exists (select 1 from public.ordens_servico o where o.id = os_id and (public.is_master() or o.prestador_id = public.current_prestador_id())));
drop policy if exists os_notas_select on public.os_notas;
create policy os_notas_select on public.os_notas for select using (
  exists (select 1 from public.ordens_servico o where o.id = os_id and (public.is_master() or o.prestador_id = public.current_prestador_id())));
drop policy if exists pagprest_select on public.pagamentos_prestador;
create policy pagprest_select on public.pagamentos_prestador for select using (
  public.is_master() or prestador_id = public.current_prestador_id());

-- 5) Pasta privada de arquivos das ordens (fotos, notas e comprovantes). Só se abre pelo sistema, com login.
insert into storage.buckets (id, name, public) values ('ordens-arquivos', 'ordens-arquivos', false) on conflict (id) do nothing;

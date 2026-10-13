-- Etapa 6: prazo da ordem, lembrete de nota fiscal e mensagens entre prestador e equipe.
-- Rode DEPOIS das etapas 1, 2_3, 4 e 5.
alter table public.ordens_servico
  add column if not exists prazo_em date,
  add column if not exists nota_lembrete_em timestamptz;

create table if not exists public.os_mensagens (
  id uuid primary key default gen_random_uuid(),
  os_id uuid not null references public.ordens_servico(id) on delete cascade,
  lado text not null check (lado in ('prestador','equipe')),
  autor_nome text,
  texto text not null,
  criado_em timestamptz not null default now()
);
create index if not exists os_mensagens_os_idx on public.os_mensagens(os_id, criado_em);
alter table public.os_mensagens enable row level security;
drop policy if exists os_mensagens_select on public.os_mensagens;
create policy os_mensagens_select on public.os_mensagens for select using (
  exists (select 1 from public.ordens_servico o where o.id = os_id and (public.is_master() or o.prestador_id = public.current_prestador_id())));

-- Acompanhamento de obra por orçamento (linha do tempo + link externo do locador)
create table if not exists public.acompanhamentos (
  id uuid primary key default gen_random_uuid(),
  orcamento_id uuid not null unique references public.orcamentos(id) on delete cascade,
  token text unique,
  link_ativo boolean not null default false,
  etapa text not null default 'aprovado'
    check (etapa in ('aprovado','iniciada','em_execucao','aguardando_material','concluida')),
  percentual int not null default 0 check (percentual between 0 and 100),
  iniciado_em timestamptz,
  concluido_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.acompanhamento_eventos (
  id uuid primary key default gen_random_uuid(),
  acompanhamento_id uuid not null references public.acompanhamentos(id) on delete cascade,
  tipo text not null check (tipo in ('etapa','foto','nota')),
  etapa text,
  percentual int,
  texto text,
  path text,
  legenda text,
  autor_nome text,
  autor_tipo text not null default 'equipe' check (autor_tipo in ('equipe','prestador','sistema')),
  os_id uuid,
  publico boolean not null default true,
  criado_em timestamptz not null default now()
);
create index if not exists acomp_ev_idx on public.acompanhamento_eventos(acompanhamento_id, criado_em desc);

alter table public.acompanhamentos enable row level security;
alter table public.acompanhamento_eventos enable row level security;

create policy acomp_master on public.acompanhamentos for all
  using (public.is_master()) with check (public.is_master());
create policy acomp_imob_sel on public.acompanhamentos for select
  using (exists (select 1 from public.orcamentos o where o.id = orcamento_id and o.cliente_id = public.current_cliente_id()));

create policy acomp_ev_master on public.acompanhamento_eventos for all
  using (public.is_master()) with check (public.is_master());
create policy acomp_ev_imob_sel on public.acompanhamento_eventos for select
  using (exists (select 1 from public.acompanhamentos a join public.orcamentos o on o.id = a.orcamento_id
                 where a.id = acompanhamento_id and o.cliente_id = public.current_cliente_id()));

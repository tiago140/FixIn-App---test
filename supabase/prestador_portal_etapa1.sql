-- Portal do prestador — Etapa 1 (login, cadastro completo, ordens de serviço, aceite e valores por item).
-- Rodar UMA vez no Supabase (SQL Editor). Só acrescenta; não altera nem apaga nada que já existe.

-- 1) Cadastro completo do prestador
alter table public.prestadores
  add column if not exists email text,
  add column if not exists tipo_pessoa text not null default 'pf' check (tipo_pessoa in ('pf','pj')),
  add column if not exists cnpj text,
  add column if not exists razao_social text,
  add column if not exists banco text,
  add column if not exists agencia text,
  add column if not exists conta text,
  add column if not exists tipo_conta text check (tipo_conta in ('corrente','poupanca','pagamento')),
  add column if not exists pix_tipo text check (pix_tipo in ('cpf','cnpj','email','telefone','aleatoria')),
  add column if not exists pix_chave text,
  add column if not exists asaas_wallet_id text,
  add column if not exists atualizado_em timestamptz not null default now();

-- 2) Usuário de login do prestador (profiles.role já aceita 'prestador')
alter table public.profiles add column if not exists prestador_id uuid references public.prestadores(id);
create index if not exists profiles_prestador_idx on public.profiles(prestador_id);

create or replace function public.current_prestador_id()
returns uuid language sql stable security definer set search_path = public as $$
  select prestador_id from public.profiles where id = auth.uid() and role = 'prestador' and coalesce(ativo, true);
$$;

-- o prestador lê só o próprio cadastro
drop policy if exists prestadores_self_select on public.prestadores;
create policy prestadores_self_select on public.prestadores for select using (id = public.current_prestador_id());

-- 3) Ordens de serviço
create sequence if not exists public.ordens_servico_seq start 1;

create table if not exists public.ordens_servico (
  id uuid primary key default gen_random_uuid(),
  numero text unique,
  prestador_id uuid not null references public.prestadores(id),
  origem text not null default 'avulsa' check (origem in ('visita','chamado','orcamento','avulsa')),
  visita_id uuid,
  chamado_id uuid,
  orcamento_id uuid references public.orcamentos(id),
  cliente_id uuid references public.clientes(id),
  endereco text not null,
  descricao text,
  status text not null default 'enviada' check (status in (
    'enviada','aceita','recusada','orcada','aplicada','em_execucao',
    'conclusao_pendente','aprovada','reprovada','paga','cancelada')),
  recusa_motivo text,
  aceito_em timestamptz,
  orcado_em timestamptz,
  liberado_em timestamptz,
  criado_por uuid references public.profiles(id),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists ordens_prestador_idx on public.ordens_servico(prestador_id, status);
create index if not exists ordens_orcamento_idx on public.ordens_servico(orcamento_id);

create or replace function public.trg_ordens_numero() returns trigger language plpgsql as $$
begin
  if new.numero is null then new.numero := 'OS-' || lpad(nextval('public.ordens_servico_seq')::text, 4, '0'); end if;
  return new;
end $$;
drop trigger if exists ordens_numero on public.ordens_servico;
create trigger ordens_numero before insert on public.ordens_servico for each row execute function public.trg_ordens_numero();

-- itens que o prestador orçou (custo dele: mão de obra e material). A margem da FixIn nunca aparece aqui.
create table if not exists public.os_itens (
  id uuid primary key default gen_random_uuid(),
  os_id uuid not null references public.ordens_servico(id) on delete cascade,
  ambiente text not null default '',
  servico text not null,
  descricao text,
  mo numeric(12,2) not null default 0,
  ma numeric(12,2) not null default 0,
  ordem int not null default 0
);
create index if not exists os_itens_os_idx on public.os_itens(os_id);

alter table public.ordens_servico enable row level security;
alter table public.os_itens enable row level security;

-- leitura: equipe FixIn vê tudo; prestador vê só as dele. Escrita só pelo servidor (service role).
drop policy if exists os_select on public.ordens_servico;
create policy os_select on public.ordens_servico for select using (public.is_master() or prestador_id = public.current_prestador_id());
drop policy if exists os_itens_select on public.os_itens;
create policy os_itens_select on public.os_itens for select using (
  exists (select 1 from public.ordens_servico o where o.id = os_id and (public.is_master() or o.prestador_id = public.current_prestador_id()))
);

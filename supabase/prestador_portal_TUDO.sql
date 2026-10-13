-- PORTAL DO PRESTADOR: etapas 1 a 6 em um arquivo só. Cole tudo no SQL Editor do Supabase e rode UMA vez.
-- Só acrescenta (if not exists); não apaga nada.

-- ===== etapa1 =====
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

-- ===== etapa2_3 =====
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

-- ===== etapa4 =====
-- Portal do prestador — Etapa 4 (termo de garantia, notificação no celular, Pix pelo Asaas).
-- Rodar DEPOIS das etapas 1 e 2/3. Só acrescenta; não altera nem apaga nada que já existe.

-- 1) Termo de garantia e responsabilidade: aceite eletrônico no primeiro login
create table if not exists public.termos_aceites (
  id uuid primary key default gen_random_uuid(),
  prestador_id uuid not null references public.prestadores(id),
  user_id uuid references public.profiles(id),
  versao text not null,
  nome_assinante text not null,
  documento text,
  texto_hash text not null,
  ip text,
  user_agent text,
  aceito_em timestamptz not null default now(),
  unique (prestador_id, versao)
);
alter table public.termos_aceites enable row level security;
drop policy if exists termos_select on public.termos_aceites;
create policy termos_select on public.termos_aceites for select using (public.is_master() or prestador_id = public.current_prestador_id());

-- 2) Aparelhos do prestador que aceitaram receber notificação no celular
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  prestador_id uuid not null references public.prestadores(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  criado_em timestamptz not null default now()
);
create index if not exists push_prestador_idx on public.push_subscriptions(prestador_id);
alter table public.push_subscriptions enable row level security; -- sem políticas: só o servidor lê e grava

-- 3) Pix pelo Asaas: o pagamento ao prestador passa a ter status e referência da transferência
alter table public.pagamentos_prestador
  add column if not exists status text not null default 'confirmado' check (status in ('processando','confirmado','falhou','cancelado')),
  add column if not exists asaas_transfer_id text unique,
  add column if not exists comprovante_url text,
  add column if not exists erro text;

-- ===== etapa5 =====
-- Etapa 5: linha do tempo da obra (início / execução / final) e link de acompanhamento para o cliente.
-- Rode DEPOIS das etapas 1, 2_3 e 4.
alter table public.os_fotos drop constraint if exists os_fotos_tipo_check;
alter table public.os_fotos add constraint os_fotos_tipo_check check (tipo in ('antes','durante','depois','reprovacao'));

alter table public.ordens_servico
  add column if not exists token_acompanhamento text unique,
  add column if not exists acompanhamento_ativo boolean not null default false;

-- ===== etapa6 =====
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

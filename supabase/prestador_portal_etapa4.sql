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

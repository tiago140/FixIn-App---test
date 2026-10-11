create table if not exists public.cobrancas (
  id uuid primary key default gen_random_uuid(),
  lancamento_id uuid not null references public.lancamentos(id) on delete cascade,
  provedor text not null default 'asaas',
  parcela text not null check (parcela in ('entrada','saldo','total')),
  valor numeric(12,2) not null check (valor > 0),
  externo_id text unique,
  url text,
  tipo_cobranca text,
  status text not null default 'pendente' check (status in ('pendente','aprovado','no_caixa','vencida','cancelada','estornada')),
  vencimento date,
  pago_em timestamptz,
  criado_por uuid,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists cobrancas_lanc_idx on public.cobrancas(lancamento_id);
alter table public.cobrancas enable row level security;
drop policy if exists cobrancas_dono_select on public.cobrancas;
create policy cobrancas_dono_select on public.cobrancas for select to authenticated using (public.is_dono());
alter table public.clientes add column if not exists asaas_customer_id text;

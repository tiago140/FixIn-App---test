-- Etapa 7: obra iniciada + interessados no acompanhamento (a imobiliária inclui locatário/locador/responsável).
alter table public.ordens_servico add column if not exists iniciada_em timestamptz;
alter table public.ordens_servico add column if not exists iniciada_por text;

create table if not exists public.os_interessados (
  id uuid primary key default gen_random_uuid(),
  os_id uuid not null references public.ordens_servico(id) on delete cascade,
  nome text not null,
  email text,
  whatsapp text,
  criado_por uuid references public.profiles(id),
  criado_por_nome text,
  avisado_em timestamptz,
  criado_em timestamptz not null default now()
);
create index if not exists os_interessados_os_idx on public.os_interessados(os_id);
alter table public.os_interessados enable row level security; -- sem política: só o servidor lê e grava
revoke all on public.os_interessados from anon, authenticated;

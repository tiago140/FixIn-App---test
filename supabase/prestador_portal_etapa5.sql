-- Etapa 5: linha do tempo da obra (início / execução / final) e link de acompanhamento para o cliente.
-- Rode DEPOIS das etapas 1, 2_3 e 4.
alter table public.os_fotos drop constraint if exists os_fotos_tipo_check;
alter table public.os_fotos add constraint os_fotos_tipo_check check (tipo in ('antes','durante','depois','reprovacao'));

alter table public.ordens_servico
  add column if not exists token_acompanhamento text unique,
  add column if not exists acompanhamento_ativo boolean not null default false;

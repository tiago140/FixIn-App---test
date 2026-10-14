-- =====================================================================
-- CORRIGE O HORÁRIO DAS VISITAS JÁ GRAVADAS (rodar UMA vez, DEPOIS do deploy)
--
-- O que acontecia: o formulário mandava "09:00" sem fuso e o servidor gravava 09:00 em UTC.
-- A tela, que mostra o horário de Brasília, exibia 06:00. Todas as visitas criadas antes da correção
-- ficaram 3 horas adiantadas no banco. Este script soma 3 horas nas visitas criadas ANTES da correção,
-- para que o horário digitado volte a aparecer certo (09:00 digitado -> 09:00 na tela).
--
-- Seguro de rodar duas vezes: um marcador impede a segunda aplicação.
-- Visitas criadas depois do deploy já entram certas e NÃO são tocadas (filtro por criado_em).
-- =====================================================================
create table if not exists public._migracoes (nome text primary key, executado_em timestamptz not null default now());
alter table public._migracoes enable row level security;  -- sem policy: só o service role enxerga

do $$
declare
  v_corte timestamptz := '2026-10-14T23:25:00Z';   -- momento do deploy da correção
  v_n int; v_s int;
begin
  if exists (select 1 from public._migracoes where nome = 'visitas_fuso_v1') then
    raise notice 'Já aplicado antes. Nada foi alterado.';
    return;
  end if;

  update public.visitas
     set data_hora = data_hora + interval '3 hours'
   where data_hora is not null and criado_em < v_corte;
  get diagnostics v_n = row_count;

  -- "nova data sugerida" pela equipe também veio sem fuso
  update public.visitas
     set data_hora_sugerida = data_hora_sugerida + interval '3 hours'
   where data_hora_sugerida is not null and criado_em < v_corte;
  get diagnostics v_s = row_count;

  insert into public._migracoes (nome) values ('visitas_fuso_v1');
  raise notice 'Visitas corrigidas: % horários, % datas sugeridas.', v_n, v_s;
end $$;

-- conferência: horários exibidos em Brasília (devem estar em horário comercial)
select to_char(data_hora at time zone 'America/Sao_Paulo', 'DD/MM HH24:MI') as horario_brasilia, endereco
from public.visitas where data_hora is not null order by data_hora desc limit 20;

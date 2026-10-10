-- Liga o orçamento aprovado à conta a pagar do prestador (e acompanha os pagamentos).
create or replace function public.trg_orcamento_sync_lancamentos() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_pago numeric; v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  perform public.gerar_lancamentos_orcamento(new.id);

  if new.valor_pago is distinct from old.valor_pago then
    update lancamentos l set
      valor_pago = least(l.valor, coalesce(new.valor_pago,0)),
      status = case when coalesce(new.valor_pago,0) >= l.valor then 'pago' else 'previsto' end,
      data_pagamento = case when coalesce(new.valor_pago,0) > 0 then coalesce(l.data_pagamento, v_hoje) else null end,
      atualizado_em = now()
    where l.orcamento_id = new.id and l.tipo = 'receber' and l.origem = 'orcamento' and l.status <> 'cancelado';
  end if;

  v_pago := case new.pagamento_prestador_status
    when 'pago_total' then coalesce(new.valor_combinado_prestador,0)
    when 'entrada_paga' then least(coalesce(new.valor_entrada_prestador,0), coalesce(new.valor_combinado_prestador,0))
    else 0 end;
  update lancamentos l set
    prestador_id = new.prestador_id,
    valor = new.valor_combinado_prestador,
    valor_pago = least(v_pago, new.valor_combinado_prestador),
    status = case when v_pago >= new.valor_combinado_prestador then 'pago' when l.status = 'pago' then 'previsto' else l.status end,
    data_pagamento = case when v_pago >= new.valor_combinado_prestador then coalesce(l.data_pagamento, v_hoje) when v_pago > 0 then l.data_pagamento else null end,
    atualizado_em = now()
  where l.orcamento_id = new.id and l.tipo = 'pagar' and l.origem = 'orcamento' and l.status <> 'cancelado'
    and coalesce(new.valor_combinado_prestador,0) > 0 and new.prestador_id is not null;
  return new;
end $$;
revoke all on function public.trg_orcamento_sync_lancamentos() from public, anon, authenticated;
drop trigger if exists orcamento_sync_lancamentos on public.orcamentos;
create trigger orcamento_sync_lancamentos after update of valor_pago, pagamento_prestador_status, prestador_id, valor_combinado_prestador, valor_entrada_prestador
on public.orcamentos for each row
when (new.status in ('aprovado','em_execucao','finalizado'))
execute function public.trg_orcamento_sync_lancamentos();

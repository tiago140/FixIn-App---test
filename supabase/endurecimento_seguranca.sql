-- FixIn — endurecimento de segurança (rodar uma vez no SQL Editor do Supabase). Seguro para repetir.
-- 1) Visitante anônimo não precisa de nenhum acesso às tabelas do portal do prestador / pagamentos / cobranças.
revoke all on public.ordens_servico, public.os_fotos, public.os_itens, public.os_mensagens, public.os_notas,
  public.pagamentos_prestador, public.push_subscriptions, public.termos_aceites, public.cobrancas from anon;
-- 2) Funções internas de permissão não devem ser chamadas por visitante sem login.
revoke execute on function public.current_prestador_id() from anon;
revoke execute on function public.current_cliente_id() from anon;
revoke execute on function public.current_role() from anon;
revoke execute on function public.current_subrole() from anon;
revoke execute on function public.is_master() from anon;
revoke execute on function public.is_dono() from anon;
revoke execute on function public.is_imobiliaria_admin() from anon;
-- 3) Função de numeração com caminho de busca fixo.
alter function public.trg_ordens_numero() set search_path = public;
-- 4) Tabelas de apoio sem uso por pessoas: só o servidor acessa (RLS ligada, sem política = ninguém de fora).
revoke all on public.chamado_recuperacoes, public.zz_import_orcamentos, public.zz_teste_removidos from anon, authenticated;

-- Pedidos de estorno (reembolso) feitos pela imobiliária.
-- Fluxo: a imobiliária (administrador) pede -> a equipe marca "em análise" -> o DONO aprova ou recusa.
-- Ao aprovar, nasce uma CONTA A PAGAR no Financeiro (lancamentos, categoria "Estorno"). Quando essa conta é paga, o pedido vira "pago".

create sequence if not exists public.estornos_seq;

create table if not exists public.estornos (
  id uuid primary key default gen_random_uuid(),
  numero text not null unique default ('EST-' || lpad(nextval('public.estornos_seq')::text, 4, '0')),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  orcamento_id uuid references public.orcamentos(id) on delete set null,
  endereco text,
  valor numeric(12,2) not null check (valor > 0 and valor <= 10000000),
  motivo text not null check (char_length(motivo) between 5 and 1500),
  favorecido text not null check (char_length(favorecido) between 2 and 120),
  documento text check (documento is null or char_length(documento) <= 30),
  pix_tipo text not null check (pix_tipo in ('cpf','cnpj','email','telefone','aleatoria')),
  pix_chave text not null check (char_length(pix_chave) between 3 and 120),
  status text not null default 'solicitado' check (status in ('solicitado','em_analise','aprovado','recusado','pago')),
  resposta text check (resposta is null or char_length(resposta) <= 1000),
  lancamento_id uuid references public.lancamentos(id) on delete set null,
  solicitado_por text,
  criado_por uuid references public.profiles(id) on delete set null,
  decidido_por uuid references public.profiles(id) on delete set null,
  decidido_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists estornos_cliente_idx on public.estornos(cliente_id, criado_em desc);
create index if not exists estornos_status_idx on public.estornos(status);

alter table public.estornos enable row level security;
-- Só leitura direta: equipe vê tudo; a imobiliária vê só os da própria empresa. Escrita só pelas funções abaixo.
create policy estornos_select on public.estornos for select
  using (is_master() or cliente_id = current_cliente_id());

-- A imobiliária pede o estorno (apenas administrador; o operacional não mexe com dinheiro).
create or replace function public.solicitar_estorno(
  p_orcamento_id uuid, p_valor numeric, p_motivo text, p_favorecido text, p_documento text, p_pix_tipo text, p_pix_chave text
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_cliente uuid; v_nome text; v_sub text; v_end text; v_id uuid;
begin
  select cliente_id, nome_completo, subrole into v_cliente, v_nome, v_sub
    from public.profiles where id = auth.uid() and role = 'imobiliaria' and coalesce(ativo, true);
  if v_cliente is null then raise exception 'apenas usuários de imobiliária podem pedir estorno'; end if;
  if coalesce(v_sub, '') = 'operacional' then raise exception 'apenas o administrador da imobiliária pode pedir estorno'; end if;
  if p_orcamento_id is not null then
    select endereco into v_end from public.orcamentos where id = p_orcamento_id and cliente_id = v_cliente;
    if v_end is null then raise exception 'orçamento não encontrado'; end if;
  end if;
  insert into public.estornos (cliente_id, orcamento_id, endereco, valor, motivo, favorecido, documento, pix_tipo, pix_chave, solicitado_por, criado_por)
  values (v_cliente, p_orcamento_id, v_end, round(p_valor, 2), btrim(p_motivo), btrim(p_favorecido), nullif(btrim(coalesce(p_documento, '')), ''), p_pix_tipo, btrim(p_pix_chave), v_nome, auth.uid())
  returning id into v_id;
  return v_id;
end $$;

-- A equipe analisa; só o dono aprova (gera a conta a pagar) ou recusa.
create or replace function public.decidir_estorno(p_id uuid, p_acao text, p_resposta text, p_vencimento date)
returns text language plpgsql security definer set search_path = public as $$
declare e public.estornos%rowtype; v_emp text; v_lanc uuid; v_desc text; v_obs text;
begin
  if not is_master() then raise exception 'sem permissão'; end if;
  select * into e from public.estornos where id = p_id for update;
  if not found then raise exception 'pedido não encontrado'; end if;
  if p_acao = 'em_analise' then
    if e.status <> 'solicitado' then raise exception 'este pedido já foi tratado'; end if;
    update public.estornos set status = 'em_analise', atualizado_em = now() where id = p_id;
    return 'em_analise';
  end if;
  if not is_dono() then raise exception 'apenas o dono aprova ou recusa estornos'; end if;
  if e.status not in ('solicitado','em_analise') then raise exception 'este pedido já foi decidido'; end if;
  if p_acao = 'recusar' then
    if coalesce(btrim(p_resposta), '') = '' then raise exception 'explique o motivo da recusa'; end if;
    update public.estornos set status = 'recusado', resposta = left(btrim(p_resposta), 1000), decidido_por = auth.uid(), decidido_em = now(), atualizado_em = now() where id = p_id;
    return 'recusado';
  end if;
  if p_acao = 'aprovar' then
    if p_vencimento is null then raise exception 'informe a data de pagamento'; end if;
    select nome_empresa into v_emp from public.clientes where id = e.cliente_id;
    v_desc := left('Estorno ' || e.numero || ' — ' || coalesce(v_emp, '') || coalesce(' · ' || e.endereco, ''), 300);
    v_obs := left('Favorecido: ' || e.favorecido || coalesce(' (' || e.documento || ')', '') || ' · Pix ' || e.pix_tipo || ': ' || e.pix_chave, 500);
    insert into public.lancamentos (tipo, descricao, categoria, valor, vencimento, status, origem, orcamento_id, cliente_id, observacao, criado_por, aprovado_por, aprovado_em)
    values ('pagar', v_desc, 'Estorno', e.valor, p_vencimento, 'aprovado', 'manual', e.orcamento_id, e.cliente_id, v_obs, auth.uid(), auth.uid(), now())
    returning id into v_lanc;
    update public.estornos set status = 'aprovado', lancamento_id = v_lanc, resposta = nullif(left(btrim(coalesce(p_resposta, '')), 1000), ''), decidido_por = auth.uid(), decidido_em = now(), atualizado_em = now() where id = p_id;
    return 'aprovado';
  end if;
  raise exception 'ação inválida';
end $$;

-- Pagou a conta no Financeiro -> o pedido de estorno vira "pago" (e a imobiliária vê). Conta cancelada -> pedido recusado.
create or replace function public.trg_estorno_acompanha_lancamento() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'pago' then
    update public.estornos set status = 'pago', atualizado_em = now() where lancamento_id = new.id and status = 'aprovado';
  elsif new.status = 'cancelado' then
    update public.estornos set status = 'recusado', resposta = coalesce(resposta, 'Cancelado pela FixIn.'), atualizado_em = now() where lancamento_id = new.id and status = 'aprovado';
  end if;
  return new;
end $$;
revoke all on function public.trg_estorno_acompanha_lancamento() from public, anon, authenticated;
create trigger estorno_acompanha_lancamento after update of status on public.lancamentos
  for each row when (new.status in ('pago','cancelado')) execute function public.trg_estorno_acompanha_lancamento();

revoke all on function public.solicitar_estorno(uuid, numeric, text, text, text, text, text) from public, anon;
revoke all on function public.decidir_estorno(uuid, text, text, date) from public, anon;
grant execute on function public.solicitar_estorno(uuid, numeric, text, text, text, text, text) to authenticated;
grant execute on function public.decidir_estorno(uuid, text, text, date) to authenticated;

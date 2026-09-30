-- ============================================================
-- FixIn Orçamentos — Schema completo (v2)
-- Este arquivo já foi aplicado no seu projeto Supabase conectado.
-- Guarde-o para o caso de precisar recriar o banco em outro projeto.
-- ============================================================

create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('master','imobiliaria','prestador')),
  subrole text check (subrole in ('admin','operacional')),
  nome_completo text not null,
  cpf text,
  email text,
  cliente_id uuid,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  email text,
  cnpj text,
  nome_empresa text not null,
  criado_por uuid references public.profiles(id),
  criado_em timestamptz not null default now()
);

alter table public.profiles
  add constraint profiles_cliente_id_fkey foreign key (cliente_id) references public.clientes(id);

create table public.prestadores (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  rg text,
  cpf text,
  telefone text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table public.catalogo_itens (
  id uuid primary key default gen_random_uuid(),
  ambiente text not null,
  servico text not null,
  mo_padrao numeric(12,2) not null default 0,
  ma_padrao numeric(12,2) not null default 0,
  criado_em timestamptz not null default now()
);

create table public.orcamentos (
  id uuid primary key default gen_random_uuid(),
  numero text unique,
  cliente_id uuid not null references public.clientes(id),
  tipo text not null default 'rescisao' check (tipo in ('rescisao','manutencao')),
  endereco text not null,
  data_orcamento date not null default current_date,
  validade_dias int not null default 30,
  prazo_execucao_dias int,
  garantia text,
  forma_pagamento text default 'Pix ou Transferência: à vista',
  margem_percentual numeric(5,2) not null default 0,
  status text not null default 'pendente' check (status in ('pendente','em_preparacao','enviado','aprovado','rejeitado','em_execucao','finalizado')),
  vistoria_texto_bruto text,
  descricao_solicitacao text,
  solicitado_por text,
  nome_cliente_final text,
  cpf_cliente_final text,
  cnpj_cliente_final text,
  prestador_id uuid references public.prestadores(id),
  valor_combinado_prestador numeric(12,2) default 0,
  valor_entrada_prestador numeric(12,2) default 0,
  pagamento_prestador_status text default 'aguardando' check (pagamento_prestador_status in ('aguardando','entrada_paga','pago_total')),
  valor_pago numeric(12,2) not null default 0,
  atrasado boolean not null default false,
  pdf_url text,
  criado_por uuid references public.profiles(id),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  aprovado_em timestamptz
);

create table public.orcamento_itens (
  id uuid primary key default gen_random_uuid(),
  orcamento_id uuid not null references public.orcamentos(id) on delete cascade,
  ambiente text not null,
  servico text not null,
  descricao text,
  mo numeric(12,2) not null default 0,
  ma numeric(12,2) not null default 0,
  ordem int not null default 0
);

create table public.orcamento_documentos_fiscais (
  id uuid primary key default gen_random_uuid(),
  orcamento_id uuid not null references public.orcamentos(id) on delete cascade,
  tipo text not null check (tipo in ('nf','boleto')),
  numero text,
  arquivo_path text not null,
  criado_por uuid references public.profiles(id),
  criado_em timestamptz not null default now()
);

create table public.mensagens (
  id uuid primary key default gen_random_uuid(),
  orcamento_id uuid not null references public.orcamentos(id) on delete cascade,
  autor_id uuid references public.profiles(id),
  autor_nome text not null,
  autor_role text not null,
  texto text,
  anexo_path text,
  anexo_tipo text,
  criado_em timestamptz not null default now()
);

create table public.visitas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id),
  prestador_id uuid references public.prestadores(id),
  endereco text not null,
  data_hora timestamptz,
  responsavel text,
  observacoes text,
  status text not null default 'confirmada' check (status in ('pendente','confirmada','cancelada')),
  criado_por_role text,
  solicitado_por text,
  criado_por uuid references public.profiles(id),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create sequence public.orcamento_numero_seq start 1;

create or replace function public.gerar_numero_orcamento()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.numero is null then
    new.numero := 'ORC-' || lpad(nextval('public.orcamento_numero_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;

create trigger trg_gerar_numero
  before insert on public.orcamentos
  for each row execute function public.gerar_numero_orcamento();

-- IMPORTANTE: estas funções precisam ser SECURITY DEFINER. Sem isso, a política RLS de profiles chama
-- a função, que lê profiles, que dispara a política de novo (recursão infinita: "stack depth limit exceeded").
create or replace function public.current_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.current_subrole()
returns text language sql stable security definer set search_path = public as $$
  select subrole from public.profiles where id = auth.uid();
$$;

create or replace function public.current_cliente_id()
returns uuid language sql stable security definer set search_path = public as $$
  select cliente_id from public.profiles where id = auth.uid();
$$;

create or replace function public.is_master()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'master' from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.is_imobiliaria_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'imobiliaria' and (subrole is null or subrole = 'admin') from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.responder_orcamento(p_orcamento_id uuid, p_novo_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cliente_id uuid;
  v_status_atual text;
begin
  if p_novo_status not in ('aprovado','rejeitado') then
    raise exception 'status inválido';
  end if;

  select cliente_id, status into v_cliente_id, v_status_atual
  from public.orcamentos where id = p_orcamento_id;

  if v_cliente_id is null then
    raise exception 'orçamento não encontrado';
  end if;

  if v_cliente_id <> public.current_cliente_id() then
    raise exception 'sem permissão para este orçamento';
  end if;

  -- antes só deixava responder com status 'enviado'; agora também libera 'pendente' e 'em_preparacao',
  -- porque nem sempre o dono passa pelo botão "Gerar PDF" antes da imobiliária decidir.
  if v_status_atual not in ('pendente', 'em_preparacao', 'enviado') then
    raise exception 'orçamento não está mais aguardando decisão';
  end if;

  update public.orcamentos
    set status = p_novo_status,
        aprovado_em = case when p_novo_status = 'aprovado' then now() else aprovado_em end,
        atualizado_em = now()
    where id = p_orcamento_id;
end;
$$;
revoke execute on function public.responder_orcamento(uuid, text) from public, anon;
grant execute on function public.responder_orcamento(uuid, text) to authenticated;

create or replace function public.solicitar_orcamento(
  p_endereco text, p_tipo text, p_descricao text,
  p_nome_cliente_final text, p_cpf_cliente_final text, p_cnpj_cliente_final text
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_cliente_id uuid; v_nome text; v_novo_id uuid;
begin
  select cliente_id into v_cliente_id from public.profiles where id = auth.uid() and role = 'imobiliaria';
  if v_cliente_id is null then raise exception 'apenas usuários de imobiliária podem solicitar'; end if;
  select nome_completo into v_nome from public.profiles where id = auth.uid();
  insert into public.orcamentos (cliente_id, endereco, tipo, descricao_solicitacao, solicitado_por,
    nome_cliente_final, cpf_cliente_final, cnpj_cliente_final, status, margem_percentual, criado_por)
  values (v_cliente_id, p_endereco, coalesce(p_tipo,'rescisao'), p_descricao, v_nome,
    p_nome_cliente_final, p_cpf_cliente_final, p_cnpj_cliente_final, 'pendente', 0, auth.uid())
  returning id into v_novo_id;
  return v_novo_id;
end;
$$;
revoke execute on function public.solicitar_orcamento(text, text, text, text, text, text) from public, anon;
grant execute on function public.solicitar_orcamento(text, text, text, text, text, text) to authenticated;

create or replace function public.solicitar_visita(p_endereco text, p_data_hora timestamptz, p_observacoes text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_cliente_id uuid; v_nome text; v_novo_id uuid;
begin
  select cliente_id into v_cliente_id from public.profiles where id = auth.uid() and role = 'imobiliaria';
  if v_cliente_id is null then raise exception 'apenas usuários de imobiliária podem solicitar visita'; end if;
  select nome_completo into v_nome from public.profiles where id = auth.uid();
  insert into public.visitas (cliente_id, endereco, data_hora, observacoes, status, criado_por_role, solicitado_por, criado_por)
  values (v_cliente_id, p_endereco, p_data_hora, p_observacoes, 'pendente', 'imobiliaria', v_nome, auth.uid())
  returning id into v_novo_id;
  return v_novo_id;
end;
$$;
revoke execute on function public.solicitar_visita(text, timestamptz, text) from public, anon;
grant execute on function public.solicitar_visita(text, timestamptz, text) to authenticated;

create or replace function public.cancelar_visita_propria(p_visita_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_cliente_id uuid; v_status text;
begin
  select cliente_id, status into v_cliente_id, v_status from public.visitas where id = p_visita_id;
  if v_cliente_id is null then raise exception 'visita não encontrada'; end if;
  if v_cliente_id <> public.current_cliente_id() then raise exception 'sem permissão'; end if;
  if v_status <> 'pendente' then raise exception 'só é possível cancelar visitas ainda pendentes'; end if;
  update public.visitas set status = 'cancelada', atualizado_em = now() where id = p_visita_id;
end;
$$;
revoke execute on function public.cancelar_visita_propria(uuid) from public, anon;
grant execute on function public.cancelar_visita_propria(uuid) to authenticated;

create or replace function public.pode_criar_acesso_imobiliaria()
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_cliente_id uuid;
begin
  if not public.is_imobiliaria_admin() then
    raise exception 'apenas administradores da imobiliária podem criar novos acessos';
  end if;
  select cliente_id into v_cliente_id from public.profiles where id = auth.uid();
  return v_cliente_id;
end;
$$;
revoke execute on function public.pode_criar_acesso_imobiliaria() from public, anon;
grant execute on function public.pode_criar_acesso_imobiliaria() to authenticated;

alter table public.profiles enable row level security;
alter table public.clientes enable row level security;
alter table public.prestadores enable row level security;
alter table public.catalogo_itens enable row level security;
alter table public.orcamentos enable row level security;
alter table public.orcamento_itens enable row level security;
alter table public.orcamento_documentos_fiscais enable row level security;
alter table public.mensagens enable row level security;
alter table public.visitas enable row level security;

create policy profiles_select on public.profiles for select
  using (id = auth.uid() or public.is_master() or cliente_id = public.current_cliente_id());

create policy clientes_master_all on public.clientes for all
  using (public.is_master()) with check (public.is_master());
create policy clientes_self_select on public.clientes for select
  using (id = public.current_cliente_id());

create policy prestadores_select on public.prestadores for select using (auth.uid() is not null);
create policy prestadores_master_write on public.prestadores for all
  using (public.is_master()) with check (public.is_master());

create policy catalogo_master_all on public.catalogo_itens for all
  using (public.is_master()) with check (public.is_master());

create policy orcamentos_select on public.orcamentos for select
  using (public.is_master() or cliente_id = public.current_cliente_id());
create policy orcamentos_master_write on public.orcamentos for all
  using (public.is_master()) with check (public.is_master());

create policy itens_select on public.orcamento_itens for select
  using (exists (select 1 from public.orcamentos o where o.id = orcamento_id
    and (public.is_master() or o.cliente_id = public.current_cliente_id())));
create policy itens_master_write on public.orcamento_itens for all
  using (public.is_master()) with check (public.is_master());

create policy docfiscais_select on public.orcamento_documentos_fiscais for select
  using (exists (select 1 from public.orcamentos o where o.id = orcamento_id
    and (public.is_master() or o.cliente_id = public.current_cliente_id())));
create policy docfiscais_master_write on public.orcamento_documentos_fiscais for all
  using (public.is_master()) with check (public.is_master());

create policy mensagens_select on public.mensagens for select
  using (public.is_master() or exists (select 1 from public.orcamentos o where o.id = orcamento_id and o.cliente_id = public.current_cliente_id()));
create policy mensagens_insert on public.mensagens for insert
  with check (autor_id = auth.uid() and (public.is_master() or exists (select 1 from public.orcamentos o where o.id = orcamento_id and o.cliente_id = public.current_cliente_id())));

create policy visitas_select on public.visitas for select
  using (public.is_master() or cliente_id = public.current_cliente_id());
create policy visitas_master_write on public.visitas for all
  using (public.is_master()) with check (public.is_master());

alter publication supabase_realtime add table public.mensagens;
alter publication supabase_realtime add table public.orcamentos;
alter publication supabase_realtime add table public.visitas;

insert into storage.buckets (id, name, public) values ('orcamentos-pdfs', 'orcamentos-pdfs', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('vistorias', 'vistorias', false) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('documentos-fiscais', 'documentos-fiscais', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('chat-anexos', 'chat-anexos', true) on conflict (id) do nothing;

create policy "leitura publica pdfs" on storage.objects for select using (bucket_id = 'orcamentos-pdfs');
create policy "upload autenticado pdfs" on storage.objects for insert with check (bucket_id = 'orcamentos-pdfs' and auth.role() = 'authenticated');
create policy "update autenticado pdfs" on storage.objects for update using (bucket_id = 'orcamentos-pdfs' and auth.role() = 'authenticated');
create policy "leitura publica docfiscais" on storage.objects for select using (bucket_id = 'documentos-fiscais');
create policy "upload autenticado docfiscais" on storage.objects for insert with check (bucket_id = 'documentos-fiscais' and auth.role() = 'authenticated');
create policy "delete autenticado docfiscais" on storage.objects for delete using (bucket_id = 'documentos-fiscais' and auth.role() = 'authenticated');
create policy "leitura publica chatanexos" on storage.objects for select using (bucket_id = 'chat-anexos');
create policy "upload autenticado chatanexos" on storage.objects for insert with check (bucket_id = 'chat-anexos' and auth.role() = 'authenticated');
create policy "leitura autenticada vistorias" on storage.objects for select using (bucket_id = 'vistorias' and auth.role() = 'authenticated');
create policy "upload autenticado vistorias" on storage.objects for insert with check (bucket_id = 'vistorias' and auth.role() = 'authenticated');

-- A imobiliária não tem permissão de UPDATE direto em visitas (só o dono tem, por segurança).
-- Esta função permite só duas ações da imobiliária, cada uma validando a transição de status:
--   1) cancelar uma visita que ela mesma pediu, ainda pendente
--   2) aceitar ou recusar uma contraproposta de data que o dono sugeriu
create or replace function public.responder_visita_imobiliaria(p_visita_id uuid, p_novo_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_visita record;
begin
  if p_novo_status not in ('confirmada', 'cancelada') then
    raise exception 'status inválido';
  end if;

  select * into v_visita from public.visitas where id = p_visita_id;
  if v_visita is null then
    raise exception 'visita não encontrada';
  end if;
  if v_visita.cliente_id <> current_cliente_id() then
    raise exception 'esta visita não é da sua imobiliária';
  end if;

  if v_visita.status = 'pendente' and p_novo_status = 'cancelada' then
    update public.visitas set status = 'cancelada', atualizado_em = now() where id = p_visita_id;
  elsif v_visita.status = 'sugerida' and p_novo_status = 'confirmada' then
    update public.visitas set status = 'confirmada', data_hora = v_visita.data_hora_sugerida, atualizado_em = now() where id = p_visita_id;
  elsif v_visita.status = 'sugerida' and p_novo_status = 'cancelada' then
    update public.visitas set status = 'cancelada', atualizado_em = now() where id = p_visita_id;
  else
    raise exception 'essa mudança de status não é permitida nesse momento';
  end if;
end;
$$;

revoke execute on function public.responder_visita_imobiliaria(uuid, text) from public, anon;
grant execute on function public.responder_visita_imobiliaria(uuid, text) to authenticated;

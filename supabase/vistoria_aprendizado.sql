-- =====================================================================
-- Leitura de laudos de vistoria que o sistema APRENDE (ex.: laudo MOV/LAG)
-- Rode no SQL Editor do Supabase. Pode rodar mais de uma vez (idempotente).
--
-- 1) vistoria_regras: como classificar cada pendência lida do laudo
--    (sujo -> limpeza, danificado -> reparo, parede/teto manchado -> pintura, removido -> reposição...).
--    cliente_id vazio = vale para todas as imobiliárias; preenchido = só para aquela imobiliária
--    (a regra da imobiliária passa na frente da geral).
-- 2) vistoria_importacoes: registro de cada laudo importado (o que entrou, o que ficou de fora,
--    quais alterações do inquilino esperam aprovação do proprietário). Serve de histórico e de base
--    para ajustar as regras com o tempo.
-- Só a equipe FixIn (master) vê e edita as duas tabelas.
-- =====================================================================

create table if not exists public.vistoria_regras (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references public.clientes(id) on delete cascade,
  prioridade int not null default 100,
  padrao text not null check (char_length(padrao) between 1 and 200),
  acao text not null check (acao in ('limpeza','reparo','pintura','reposicao','verificar')),
  observacao text,
  ativo boolean not null default true,
  origem text not null default 'equipe' check (origem in ('sistema','equipe')),
  criado_por uuid references public.profiles(id),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- impede repetir a mesma regra geral (o seed abaixo pode ser rodado de novo sem duplicar)
create unique index if not exists vistoria_regras_geral_unica
  on public.vistoria_regras (padrao, acao) where cliente_id is null;
create index if not exists vistoria_regras_cliente_idx on public.vistoria_regras (cliente_id, ativo, prioridade);

create table if not exists public.vistoria_importacoes (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references public.clientes(id) on delete set null,
  orcamento_id uuid references public.orcamentos(id) on delete set null,
  arquivo_nome text,
  formato text,
  total_itens int not null default 0,
  total_a_conferir int not null default 0,
  total_alteracoes int not null default 0,
  por_acao jsonb not null default '{}'::jsonb,        -- ex.: {"limpeza": 12, "reparo": 40}
  alteracoes_aprovacao jsonb not null default '[]'::jsonb,  -- o que o inquilino mudou e o proprietário precisa aprovar
  a_conferir jsonb not null default '[]'::jsonb,       -- linhas que o leitor não soube encaixar
  criado_por uuid references public.profiles(id),
  criado_em timestamptz not null default now()
);
create index if not exists vistoria_importacoes_cliente_idx on public.vistoria_importacoes (cliente_id, criado_em desc);

alter table public.vistoria_regras enable row level security;
alter table public.vistoria_importacoes enable row level security;

drop policy if exists vistoria_regras_master on public.vistoria_regras;
create policy vistoria_regras_master on public.vistoria_regras for all
  using (public.is_master()) with check (public.is_master());

drop policy if exists vistoria_importacoes_master on public.vistoria_importacoes;
create policy vistoria_importacoes_master on public.vistoria_importacoes for all
  using (public.is_master()) with check (public.is_master());

-- Regras iniciais (as mesmas que o sistema já usa por padrão). Padrão = expressão regular,
-- aplicada ao texto sem acentos e em minúsculas. Menor prioridade = testa primeiro.
insert into public.vistoria_regras (prioridade, padrao, acao, origem, observacao) values
  (10, 'removid|retirad|sem chave|sem grade|sem tampa|sem separador|faltando|furtad|levad', 'reposicao', 'sistema', 'Item que falta ou foi levado: repor'),
  (20, 'sem gas para teste|funcionando parcialmente|funcionamento parcial|baixa luminosidade', 'verificar', 'sistema', 'Só se confere com teste ou visita'),
  (25, 'pintura nova|nao foram pintad|nao foi pintad|falhas? na cobertura|pintura (inicial|descascad)|descascad.*pintura', 'pintura', 'sistema', 'Pintura nova não refeita ou com falhas'),
  (28, 'lasca|estufament|danificad|quebrad|vazament|sem funcionamento|sem tensao|solto|soltando|desregulad|nao abre|pingando', 'reparo', 'sistema', 'Dano físico: reparo, mesmo que cite sujidade'),
  (30, 'sujo|suja|sujidade|sujeira|barro|mato|etiqueta|fita (colante|adesiva)|resquicio|cola\b|entupid|pertences|inseto|churrasqueira', 'limpeza', 'sistema', 'Sujeira declarada: limpeza'),
  (40, 'pintura|dualidade de tons|marca[s]? de reparo|(mancha|escorrido)s?.*(parede|teto|rodape)|(parede|teto|rodape)s?.*mancha|furo[s]? tampado[s]?|furos? com bucha|buchas', 'pintura', 'sistema', 'Parede/teto manchado, marca de reparo, cor diferente'),
  (50, 'mancha', 'limpeza', 'sistema', 'Outras manchas (piso, cortina, pedra, azulejo)'),
  (90, '.', 'reparo', 'sistema', 'O resto (danificado, lascas, estufamento, solto, quebrado, vazamento...) é reparo')
on conflict do nothing;

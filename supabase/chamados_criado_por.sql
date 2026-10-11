-- Guarda quem abriu o chamado por dentro do sistema, para o aviso por e-mail chegar também a essa pessoa.
-- O código funciona com ou sem esta coluna (sem ela, só os administradores recebem).
alter table public.chamados add column if not exists criado_por uuid references public.profiles(id);

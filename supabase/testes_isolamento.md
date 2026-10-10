# Teste de isolamento entre imobiliárias

Como repetir (SQL Editor do Supabase, em uma transação):
1. `begin; set local role authenticated; select set_config('request.jwt.claims', '{"sub":"<ID do usuário de uma imobiliária>","role":"authenticated"}', true);`
2. Consulte `orcamentos`, `visitas`, `laudos`, `chamados`, `profiles`, `clientes`, `orcamento_itens`, `mensagens`, `chamado_mensagens`, `auditoria`.
3. Esperado: só linhas da própria imobiliária (cliente_id dela). Qualquer linha de outra = falha grave.
4. `rollback;`
Também testar com `set local role anon;`: todas as tabelas devem negar acesso (exceto INSERT em `leads_site`).
Último resultado (out/2026): todas as tabelas aprovadas.

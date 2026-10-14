import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classificarPendencias, contarPorAcao } from '../lib/classificarPendencia.js';
import { organizarSeguroFianca } from '../lib/seguroFianca.js';

const it = (ambiente, servico) => ({ ambiente, servico, descricao: '', mo: 0, ma: 0 });
const acao = (a, s) => classificarPendencias([it(a, s)])[0].acao;

test('sujo vira limpeza, danificado vira reparo', () => {
  assert.equal(acao('Quintal piscina', 'Piscina suja'), 'limpeza');
  assert.equal(acao('Cozinha', 'Forno com sujidades'), 'limpeza');
  assert.equal(acao('Varanda', 'Paredes e piso com sujidades além do uso comum (manchas de barro)'), 'limpeza');
  assert.equal(acao('Banheiro Social', 'Porta com estufamento e lascas'), 'reparo');
  assert.equal(acao('Banheiro Suíte 1', 'Ducha higiênica com vazamento'), 'reparo');
  assert.equal(acao('Lavabo', 'Sifão com vazamento'), 'reparo');
});

test('parede/teto manchado e marca de reparo viram pintura; item removido vira reposição', () => {
  assert.equal(acao('Corredor', 'Teto com manchas próximo a porta balcão'), 'pintura');
  assert.equal(acao('Sala 02', 'Marca de reparo na parede da lareira'), 'pintura');
  assert.equal(acao('Geral', 'Rodapés com manchas/sujidades'), 'limpeza');
  assert.equal(acao('Cozinha', 'Pedra da ilha com pequenas manchas'), 'limpeza');
  assert.equal(acao('Área técnica', 'Botijão de gás foi removido – haviam dois'), 'reposicao');
  assert.equal(acao('Dormitório 4', 'Porta sem chaves'), 'reposicao');
});

test('pintura nova não refeita é pintura; dano com sujidade é reparo', () => {
  assert.equal(acao('Geral', 'Tetos não foram pintados, apresentam manchas/sujidades, pintura inicial era nova'), 'pintura');
  assert.equal(acao('Sala 02', 'Porta de acesso ao hall dormitório com lasca e estufamento, e sujidades na parte inferior'), 'reparo');
  assert.equal(acao('Lavabo', 'Ralo da pia sujo'), 'limpeza');
  assert.equal(acao('Dormitório 4', 'Luminárias com insetos'), 'limpeza');
});

test('o que só se confere com teste vira "verificar"', () => {
  assert.equal(acao('Cozinha', 'Sem gás para testes das chamas do cooktop'), 'verificar');
  assert.equal(acao('Cozinha', 'Fita de LED do teto funcionando parcialmente'), 'verificar');
});

test('o texto é reescrito e, no seguro fiança, cai no grupo certo', () => {
  const r = classificarPendencias([it('Quintal piscina', 'Piscina suja'), it('Lavabo', 'Sifão com vazamento'), it('Sala', 'Marca de reparo na parede')]);
  assert.equal(r[0].servico, 'Limpeza: piscina suja');
  const grupos = organizarSeguroFianca(r).map((i) => i.ambiente);
  assert.deepEqual(grupos, ['Pintura geral', 'Reparos', 'Faxina e limpeza']);
});

test('regra do banco vale mais que a padrão e regra inválida é ignorada', () => {
  const regras = [
    { prioridade: 1, acao: 'limpeza', padrao: 'geladeira' },
    { prioridade: 2, acao: 'reparo', padrao: '(quebrada' },
    { prioridade: 99, acao: 'reparo', padrao: '.' },
  ];
  assert.equal(classificarPendencias([it('Cozinha', 'Geladeira com leves riscos')], regras)[0].acao, 'limpeza');
  assert.equal(classificarPendencias([it('Sala', 'Algo qualquer')], regras)[0].acao, 'reparo');
  assert.deepEqual(contarPorAcao(classificarPendencias([it('A', 'sujo'), it('B', 'quebrado')])), { limpeza: 1, reparo: 1 });
});

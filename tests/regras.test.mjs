import { test } from 'node:test';
import assert from 'node:assert/strict';
import { arredondarParaCima, calcularTotalComMargem, calcularProximoStatusAutomatico } from '../lib/format.js';
import { organizarSeguroFianca, categoriaSeguroFianca, GRUPOS_SEGURO_FIANCA } from '../lib/seguroFianca.js';
import { veValores, rotuloPerfil } from '../lib/permissoes.js';
import { validarSenhaForte, gerarSenha } from '../lib/senha.js';
import { totalItensOS } from '../lib/ordensStatus.js';

test('valores arredondam sempre para cima, em reais inteiros', () => {
  assert.equal(arredondarParaCima(1650.01), 1651);
  assert.equal(arredondarParaCima(1650), 1650);
  assert.equal(arredondarParaCima('abc'), 0);
});

test('total com margem soma linha a linha já arredondada', () => {
  const itens = [{ mo: 100, ma: 50 }, { mo: 33.3, ma: 0 }];
  // 130 + 65 + ceil(43.29)=44
  assert.equal(calcularTotalComMargem(itens, 30), 239);
  assert.equal(calcularTotalComMargem([], 30), 0);
});

test('status automático: PDF envia, pagamento total finaliza, rejeitado/finalizado não mudam', () => {
  assert.equal(calcularProximoStatusAutomatico({ status: 'pendente' }, 'pdf'), 'enviado');
  assert.equal(calcularProximoStatusAutomatico({ status: 'rejeitado' }, 'pdf'), null);
  assert.equal(calcularProximoStatusAutomatico({ status: 'finalizado' }, 'pagamento'), null);
  const o = { status: 'em_execucao', margem_percentual: 0, itens: [{ mo: 100, ma: 0 }], valor_pago: 100 };
  assert.equal(calcularProximoStatusAutomatico(o, 'pagamento'), 'finalizado');
  assert.equal(calcularProximoStatusAutomatico({ ...o, valor_pago: 99 }, 'pagamento'), null);
});

test('seguro fiança: ordem fixa Pintura → Reparos → Limpeza', () => {
  const itens = [
    { servico: 'Faxina geral do imóvel', mo: 1, ma: 0 },
    { servico: 'Trocar torneira', mo: 1, ma: 0 },
    { servico: 'Pintura das paredes', mo: 1, ma: 0 },
  ];
  const ord = organizarSeguroFianca(itens).map((i) => i.ambiente);
  assert.deepEqual(ord, GRUPOS_SEGURO_FIANCA);
  assert.equal(categoriaSeguroFianca({ servico: 'Limpeza pós-obra' }), 'Faxina e limpeza');
  assert.equal(categoriaSeguroFianca({ servico: 'Reparo no gabinete' }), 'Reparos');
});

test('seguro fiança: dividir separa itens compostos e deixa o preço só no primeiro', () => {
  const r = organizarSeguroFianca([{ id: 'a', servico: 'Realizar pintura; trocar fechadura', mo: 200, ma: 50 }], { dividir: true });
  assert.equal(r.length, 2);
  const preco = r.reduce((s, i) => s + i.mo + i.ma, 0);
  assert.equal(preco, 250);
});

test('permissões: operacional não vê valores, admin e master veem, prestador é tratado à parte', () => {
  assert.equal(veValores({ role: 'imobiliaria', subrole: 'operacional' }), false);
  assert.equal(veValores({ role: 'imobiliaria', subrole: 'admin' }), true);
  assert.equal(veValores({ role: 'master' }), true);
  assert.equal(veValores({ role: 'prestador' }), 'Prestador');
  assert.equal(veValores(null), false);
  assert.equal(rotuloPerfil({ role: 'master', dono: true }), 'Dono');
});

test('senha: rejeita curta, sem número, comum; aceita boa; gerada passa na regra', () => {
  assert.ok(validarSenhaForte('abc1'));
  assert.ok(validarSenhaForte('somenteletras'));
  assert.ok(validarSenhaForte('adm12345'));
  assert.equal(validarSenhaForte('Obra2026x'), null);
  for (let i = 0; i < 20; i++) assert.equal(gerarSenha(10).length, 10);
});

test('total dos itens da OS ignora lixo', () => {
  assert.equal(totalItensOS([{ mo: '10', ma: 5 }, { mo: null }, {}]), 15);
});

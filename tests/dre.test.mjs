import test from 'node:test';
import assert from 'node:assert/strict';
import { montarDre, totalAno } from '../lib/dre.js';

const L = [
  { tipo: 'receber', categoria: 'Serviços', status: 'pago', valor: 1000, valor_pago: 1000, vencimento: '2026-10-05', data_pagamento: '2026-10-07' },
  { tipo: 'receber', categoria: 'Serviços', status: 'previsto', valor: 500, valor_pago: 0, vencimento: '2026-11-10' },
  { tipo: 'pagar', categoria: 'Prestadores', status: 'pago', valor: 400, valor_pago: 400, vencimento: '2026-10-20', data_pagamento: '2026-10-20' },
  { tipo: 'pagar', categoria: 'Software e sistemas', status: 'previsto', valor: 100, valor_pago: 0, vencimento: '2026-11-15' },
  { tipo: 'receber', categoria: 'Serviços', status: 'cancelado', valor: 9999, valor_pago: 0, vencimento: '2026-10-01' },
];
test('caixa: só o que foi pago, no mês do pagamento', () => {
  const d = montarDre(L, 2026, 'caixa');
  assert.equal(d.receitaBruta[9], 1000);
  assert.equal(totalAno(d.receitaBruta), 1000);
  assert.equal(d.custos[9], 400);
  assert.equal(totalAno(d.resultado), 600);
});
test('previsto: tudo lançado no mês do vencimento, sem cancelados', () => {
  const d = montarDre(L, 2026, 'previsto');
  assert.equal(totalAno(d.receitaBruta), 1500);
  assert.equal(d.despesas[10], 100);
  assert.equal(totalAno(d.resultado), 1000);
});

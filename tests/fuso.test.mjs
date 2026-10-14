import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paraInstanteBrasilia, partesSP, chaveDia, fmtHoraSP } from '../lib/fuso.js';

test('horário digitado vira horário de Brasília (e não UTC)', () => {
  assert.equal(paraInstanteBrasilia('2026-10-14T09:00'), '2026-10-14T09:00:00-03:00');
  assert.equal(new Date(paraInstanteBrasilia('2026-10-14T09:00')).toISOString(), '2026-10-14T12:00:00.000Z');
  assert.equal(fmtHoraSP(paraInstanteBrasilia('2026-10-14T09:00')), '09:00');
});

test('quem já traz fuso é mantido; vazio e inválido não passam', () => {
  assert.equal(paraInstanteBrasilia('2026-10-14T12:00:00Z'), '2026-10-14T12:00:00Z');
  assert.equal(paraInstanteBrasilia('2026-10-14T09:00:00-03:00'), '2026-10-14T09:00:00-03:00');
  assert.equal(paraInstanteBrasilia(''), null);
  assert.equal(paraInstanteBrasilia(null), null);
  assert.equal(paraInstanteBrasilia('lixo'), null);
  assert.equal(paraInstanteBrasilia('2026-13-45T09:00'), null);
});

test('o erro antigo: 09:00 gravado como UTC aparecia 06:00', () => {
  assert.equal(fmtHoraSP('2026-10-14T09:00:00Z'), '06:00');
});

test('dia e hora certos perto da meia-noite', () => {
  // 23:30 em Brasília = 02:30 UTC do dia seguinte
  const iso = paraInstanteBrasilia('2026-10-14T23:30');
  assert.equal(chaveDia(iso), '2026-10-14');
  assert.equal(fmtHoraSP(iso), '23:30');
  const p = partesSP('2026-10-14T12:00:00Z');
  assert.deepEqual([p.ano, p.mes, p.dia, p.hora, p.sem], [2026, 10, 14, 9, 3]); // quarta
});

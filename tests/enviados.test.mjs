import { test } from 'node:test';
import assert from 'node:assert/strict';
import { intervalo } from '../lib/periodos.js';
import { resumirEventos, contarPorPessoa } from '../lib/orcamentosEnviados.js';

const quarta = new Date('2026-11-04T15:00:00-03:00'); // quarta-feira
test('períodos em horário de Brasília', () => {
  assert.deepEqual(intervalo('hoje', quarta), { de: '2026-11-04', ate: '2026-11-04' });
  assert.deepEqual(intervalo('ontem', quarta), { de: '2026-11-03', ate: '2026-11-03' });
  assert.deepEqual(intervalo('semana', quarta), { de: '2026-11-02', ate: '2026-11-04' });
  assert.deepEqual(intervalo('mes', quarta), { de: '2026-11-01', ate: '2026-11-04' });
  assert.deepEqual(intervalo('mes_passado', quarta), { de: '2026-10-01', ate: '2026-10-31' });
  assert.deepEqual(intervalo('semana', new Date('2026-11-01T23:30:00-03:00')), { de: '2026-10-26', ate: '2026-11-01' }); // domingo à noite
});
test('feito e enviado por orçamento e por pessoa', () => {
  const ev = [
    { alvo_id: 'a', acao: 'Gerou PDF (sem enviar e-mail)', autor_id: 'u1', autor_nome: 'Luiz', criado_em: '2026-11-02T10:00:00Z' },
    { alvo_id: 'a', acao: 'Enviou orçamento (PDF e e-mail)', autor_id: 'u2', autor_nome: 'Tiago', criado_em: '2026-11-02T12:00:00Z' },
    { alvo_id: 'b', acao: 'Gerou PDF do orçamento (sem e-mail)', autor_id: 'u1', autor_nome: 'Luiz', criado_em: '2026-11-02T11:00:00Z' },
  ];
  const m = resumirEventos(ev);
  assert.equal(m.get('a').feitoPor, 'Luiz');
  assert.equal(m.get('a').enviadoPor, 'Tiago');
  assert.equal(m.get('b').enviadoEm, undefined);
  const p = contarPorPessoa(m);
  assert.deepEqual(p.map((x) => [x.nome, x.feitos, x.enviados]), [['Tiago', 0, 1], ['Luiz', 2, 0]]);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { valorExtenso } from '../lib/valorExtenso.js';

test('valor por extenso', () => {
  assert.equal(valorExtenso(150), 'cento e cinquenta reais');
  assert.equal(valorExtenso(1), 'um real');
  assert.equal(valorExtenso(0), 'zero reais');
  assert.equal(valorExtenso(1000), 'mil reais');
  assert.equal(valorExtenso(1250.5), 'mil duzentos e cinquenta reais e cinquenta centavos');
  assert.equal(valorExtenso(5950), 'cinco mil novecentos e cinquenta reais');
  assert.equal(valorExtenso(2000100), 'dois milhões e cem reais');
  assert.equal(valorExtenso(100), 'cem reais');
});

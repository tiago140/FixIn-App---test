import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chaveTabelaSeguroFianca, separarPrecosSeguroFianca, elevarDemais, TABELA_SEGURO_FIANCA } from '../lib/precoSeguroFianca.js';

const it = (servico, descricao = '', ambiente = 'Sala') => ({ id: servico + descricao, ambiente, servico, descricao, mo: 0, ma: 0 });

test('pintura de parede, porta e teto usam a tabela', () => {
  assert.equal(chaveTabelaSeguroFianca(it('Teto', 'pintura apresenta manchas e falhas de cobertura')), 'teto');
  assert.equal(chaveTabelaSeguroFianca(it('Paredes', 'pintura com falhas de cobertura')), 'parede');
  assert.equal(chaveTabelaSeguroFianca(it('Porta', 'pintura com manchas, fazer pintura nova')), 'porta');
  assert.equal(chaveTabelaSeguroFianca(it('Sala: Teto', 'pintura da parede ao lado')), 'teto');
  assert.deepEqual([TABELA_SEGURO_FIANCA.parede.mo, TABELA_SEGURO_FIANCA.parede.ma], [150, 100]);
  assert.deepEqual([TABELA_SEGURO_FIANCA.porta.mo, TABELA_SEGURO_FIANCA.porta.ma], [150, 100]);
  assert.deepEqual([TABELA_SEGURO_FIANCA.teto.mo, TABELA_SEGURO_FIANCA.teto.ma], [100, 100]);
});

test('planejado/gabinete danificado: 250 MO + 350 MA por item; sujo não conta', () => {
  assert.equal(chaveTabelaSeguroFianca(it('Gabinete', 'danificado', 'Cozinha')), 'planejado');
  assert.equal(chaveTabelaSeguroFianca(it('Armário planejado', 'porta quebrada', 'Quarto')), 'planejado');
  assert.equal(chaveTabelaSeguroFianca(it('Armário Embutido', 'com manchas de sujeira', 'Quarto')), null);
  assert.equal(TABELA_SEGURO_FIANCA.planejado.mo + TABELA_SEGURO_FIANCA.planejado.ma, 600);
});

test('outros itens não usam a tabela', () => {
  for (const x of [it('Maçanetas frouxas'), it('Vaso Sanitário', 'ponto danificado'), it('Janela', 'manchas de sujeira, fazer limpeza'), it('Piso', 'respingos de tinta')]) {
    assert.equal(chaveTabelaSeguroFianca(x), null, x.servico);
  }
});

test('separar: fixos recebem a tabela, demais seguem para a IA', () => {
  const r = separarPrecosSeguroFianca([it('Teto', 'pintura com manchas'), it('Maçanetas frouxas'), it('Gabinete', 'danificado')]);
  assert.deepEqual(r.fixos.map((f) => [f.mo, f.ma, f.origem]), [[100, 100, 'regra'], [250, 350, 'regra']]);
  assert.equal(r.demais.length, 1);
});

test('demais itens sobem 20%', () => {
  const r = elevarDemais([{ id: 1, mo: 18, ma: 2, origem: 'catalogo' }, { id: 2, mo: 53, ma: 29, origem: 'estimativa' }]);
  assert.deepEqual(r.map((v) => [v.mo, v.ma]), [[22, 2], [64, 35]]);
});

test('mancha pontual, respingo e cerâmica NÃO usam a tabela de repintura', () => {
  assert.equal(chaveTabelaSeguroFianca(it('Teto', 'apresenta uma mancha de tinta')), null);
  assert.equal(chaveTabelaSeguroFianca(it('Paredes', 'cerâmica apresenta manchas de tinta próximo a porta')), null);
  assert.equal(chaveTabelaSeguroFianca(it('Porta', 'apresenta manchas de tinta e de sujeira')), null);
  assert.equal(chaveTabelaSeguroFianca(it('Piso', 'respingos de tinta')), null);
  assert.equal(chaveTabelaSeguroFianca(it('Porta', 'apresenta manchas e escorridos de tinta, fazer pintura nova')), 'porta');
  assert.equal(chaveTabelaSeguroFianca(it('Teto', 'apresenta manchas e pontos descascados')), 'teto');
});

test('nome do local ("Sala Piso Superior") não atrapalha a regra', () => {
  assert.equal(chaveTabelaSeguroFianca(it('Sala Piso Superior: Paredes', 'pintura com falhas de cobertura, fazer repintura', 'Pintura geral')), 'parede');
  assert.equal(chaveTabelaSeguroFianca(it('Sala Piso Superior: Piso', 'com respingos e manchas de tinta', 'Pintura geral')), null);
  assert.equal(chaveTabelaSeguroFianca(it('Banheiro Social Piso Superior: Teto', 'apresenta descascados e falhas de cobertura', 'Pintura geral')), 'teto');
});

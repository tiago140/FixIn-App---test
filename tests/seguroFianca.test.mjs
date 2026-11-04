import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prepararSeguroFianca, dividirItemSeguroFianca, organizarSeguroFianca, unirAcoesSoltas, auditarSeguroFianca, ehAcaoSolta, categoriaSeguroFianca } from '../lib/seguroFianca.js';
import { parseVistoriaTexto } from '../lib/parseVistoria.js';

const base = (servico, descricao = '', ambiente = 'Sala', mo = 0, ma = 0) => ({ id: servico, ambiente, servico, descricao, mo, ma });
const partes = (arr) => arr.map((i) => [i.servico, i.descricao]);

test('ação corretiva não vira item: problema e solução ficam juntos (ORC-0047)', () => {
  assert.equal(dividirItemSeguroFianca(base('Teto', 'pintura apresenta manchas e falhas de cobertura, fazer repintura')).length, 1);
  assert.equal(dividirItemSeguroFianca(base('Janela', 'apresenta manchas de sujeira,fazer limpeza')).length, 1);
  assert.equal(dividirItemSeguroFianca(base('Piso', 'deixado tapete, retirar')).length, 1);
  assert.equal(dividirItemSeguroFianca(base('Parede', 'instalado suporte. retirar')).length, 1);
  assert.equal(dividirItemSeguroFianca(base('Porta', 'apresenta manchas; fazer pintura nova')).length, 1);
});

test('problemas DIFERENTES continuam separados, só o primeiro leva preço', () => {
  const r = dividirItemSeguroFianca(base('Realizar pintura, gabinete danificado', '', 'Cozinha', 40, 10));
  assert.deepEqual(partes(r), [['Realizar pintura', ''], ['Gabinete danificado', '']]);
  assert.equal(r[0].mo, 40);
  assert.equal(r[1].mo, 0);
  const s = dividirItemSeguroFianca(base('Porta', 'riscada, trocar fechadura', 'Quarto', 30, 5));
  assert.equal(s.length, 2);
  assert.equal(s[1].servico, 'Trocar fechadura');
  assert.equal(s[1].mo, 0);
});

test('organizar não cria item de ação nem separa o problema da solução', () => {
  const itens = [base('Teto', 'manchas, fazer repintura'), base('Janela', 'suja, fazer limpeza'), base('Piso', 'deixado tapete, retirar')];
  const out = organizarSeguroFianca(itens, { dividir: true });
  assert.equal(out.length, 3);
  assert.deepEqual(out.map((i) => i.ambiente), ['Pintura geral', 'Reparos', 'Faxina e limpeza']);
  assert.ok(out.find((i) => i.servico.includes('Teto')).ambiente === 'Pintura geral');
  assert.ok(out.find((i) => i.servico.includes('Janela')).ambiente === 'Faxina e limpeza');
});

test('classifica falha de cobertura / descascado como pintura', () => {
  assert.equal(categoriaSeguroFianca(base('Teto', 'apresenta falhas de cobertura')), 'Pintura geral');
  assert.equal(categoriaSeguroFianca(base('Teto', 'apresenta manchas e pontos descascados')), 'Pintura geral');
  assert.equal(categoriaSeguroFianca(base('Porta', 'apresenta manchas, fazer pintura nova')), 'Pintura geral');
  assert.equal(categoriaSeguroFianca(base('Janela', 'manchas de sujeira, fazer limpeza')), 'Faxina e limpeza');
  assert.equal(categoriaSeguroFianca(base('Vaso Sanitário', 'ponto danificado')), 'Reparos');
});

test('ehAcaoSolta reconhece só ações genéricas', () => {
  for (const t of ['Fazer repintura', 'Refazer pintura', 'Retirar', 'Providenciar', 'Fazer remoção e limpeza', 'Fazer os reparos necessários', 'Retirar ou verificar permanência', 'Fazer limpeza geral']) assert.equal(ehAcaoSolta(t), true, t);
  for (const t of ['Trocar fechadura', 'Instalar prateleira', 'Gabinete danificado', 'Espelhos de luz com manchas de tinta', 'Fazer pintura da porta e trocar dobradiças']) assert.equal(ehAcaoSolta(t), false, t);
});

test('unirAcoesSoltas conserta o ORC-0047 já gravado: junta no item do mesmo local e não soma o preço', () => {
  const P = 'Pintura geral';
  const itens = [
    { id: 1, ambiente: P, servico: 'Sala: Teto', descricao: 'pintura apresenta manchas e galhas de cobertura', mo: 43, ma: 29 },
    { id: 2, ambiente: P, servico: 'Sala: Fazer repintura', descricao: '', mo: 43, ma: 29 },
    { id: 3, ambiente: P, servico: 'Sala: Paredes', descricao: 'pintura apresenta falhas de cobertura', mo: 61, ma: 31 },
    { id: 4, ambiente: P, servico: 'Sala: Fazer repintura', descricao: '', mo: 61, ma: 31 },
    { id: 5, ambiente: P, servico: 'Dormitório 01: Fazer repintura', descricao: '', mo: 19, ma: 2 }, // órfão: sem item antes
    { id: 6, ambiente: 'Reparos', servico: 'Banheiro Social: Piso', descricao: 'deixado tapete', mo: 10, ma: 0 },
    { id: 7, ambiente: 'Reparos', servico: 'Banheiro Social: Retirar', descricao: '', mo: 10, ma: 0 },
    { id: 8, ambiente: 'Reparos', servico: 'Varanda: Deixado dois sacos de carvão', descricao: '', mo: 10, ma: 0 },
    { id: 9, ambiente: 'Reparos', servico: 'Varanda: Retirar', descricao: '', mo: 10, ma: 0 },
  ];
  const r = unirAcoesSoltas(itens);
  assert.equal(r.itens.length, 5);
  assert.equal(r.unidas, 4);
  assert.equal(r.valorEvitado, 72 + 92 + 10 + 10);
  assert.equal(r.itens[0].descricao, 'pintura apresenta manchas e galhas de cobertura, fazer repintura');
  assert.equal(r.itens[0].mo + r.itens[0].ma, 72);
  assert.equal(itens.length, 9, 'não altera a lista original');
  const av = auditarSeguroFianca(r.itens);
  assert.equal(av.filter((a) => a.tipo === 'acao_solta').length, 1, 'o órfão continua apontado');
  assert.match(av[0].texto, /Dormitório 01/);
});

test('auditoria acusa título de outra seção colado e item repetido', () => {
  const av = auditarSeguroFianca([
    base('Cozinha: Fazer limpeza 7. Escadaria Apresenta Manchas de Tinta Branca Nos Degraus'),
    base('Piso', 'sujo'), base('Piso', 'sujo'),
  ]);
  assert.ok(av.some((a) => a.tipo === 'titulo_colado'));
  assert.ok(av.some((a) => a.tipo === 'duplicado'));
});

test('leitor de vistoria: título de seção colado no fim da linha não vira texto do item anterior', () => {
  const txt = ['1. Cozinha', '1.1 - Parede: cerâmica apresenta manchas de tinta', '1.2 - Piso: sujo, Fazer limpeza 7. Escadaria Apresenta Manchas de Tinta Branca Nos Degraus', '7.1 - Degraus: com manchas de tinta branca'].join('\n');
  const r = parseVistoriaTexto(txt);
  assert.deepEqual(r.map((i) => i.ambiente), ['Cozinha', 'Cozinha', 'Escadaria']);
  assert.ok(!r.some((i) => /Escadaria/.test(i.descricao)));
});

test('prepararSeguroFianca: fluxo completo da vistoria ao orçamento, sem item de ação e sem preço dobrado', () => {
  const itens = [
    { id: 'a', ambiente: 'Sala', servico: 'Teto', descricao: 'pintura com manchas, fazer repintura', mo: 43, ma: 29 },
    { id: 'b', ambiente: 'Sala', servico: 'Fazer repintura', descricao: '', mo: 43, ma: 29 },
    { id: 'c', ambiente: 'Cozinha', servico: 'Teto', descricao: 'apresenta falhas de cobertura', mo: 53, ma: 29 },
    { id: 'd', ambiente: 'Varanda', servico: 'Piso', descricao: 'deixado cabo de esfregão, retirar', mo: 10, ma: 0 },
  ];
  const r = prepararSeguroFianca(itens);
  assert.equal(r.itens.length, 3);
  assert.equal(r.itens.reduce((t, i) => t + i.mo + i.ma, 0), 72 + 82 + 10);
  assert.deepEqual(r.itens.map((i) => i.ambiente), ['Pintura geral', 'Pintura geral', 'Reparos']);
});

test('ao juntar, fica o par MO/material do item mais caro (não mistura os dois)', () => {
  const r = unirAcoesSoltas([
    { id: 1, ambiente: 'Reparos', servico: 'Banheiro: Porta papel', descricao: '', mo: 18, ma: 23 },
    { id: 2, ambiente: 'Reparos', servico: 'Banheiro: Providenciar', descricao: '', mo: 12, ma: 29 },
  ]);
  assert.equal(r.itens.length, 1);
  assert.equal(r.itens[0].mo + r.itens[0].ma, 41);
  assert.equal(r.valorEvitado, 41);
});

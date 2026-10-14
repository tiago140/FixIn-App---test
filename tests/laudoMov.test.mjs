import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseVistoriaTexto, extrairEnderecoVistoria, ehLaudoMov } from '../lib/parseVistoria.js';

// Texto sintético no formato do laudo MOV/LAG (sem dados de clientes reais).
const LAUDO = `LAUDO DE VISTORIA FINAL
LOCADOR: FULANO
IMÓVEL: CA00001 Rua Exemplo nº 10, Lote 1
ESTADO GERAL DE LIMPEZA DO IMÓVEL: SUJO
LINK DE ACESSO AO ALBUM DE FOTOS
VISTORIA FINAL: https://photos.app.goo.gl/abc
ALTERAÇÃO SUJEITA A APROVAÇÃO DO PROPRIETÁRIO
MOV SERVIÇOS IMOBILIÁRIOS
Vistorias | Fotos Comerciais | Placas | Tour Virtual | +
Sala: alteração de cor da pintura paredes
INICIAL FINAL
Banheiro Social: Instalação de gancho na parede
INICIAL FINAL
DETALHAMENTO DAS DIVERGÊNCIAS COM FOTOS
Observação: Consulte mais fotos no link de fotos de vistoria final
Geral
Pintura nova com falhas na cobertura
Rodapés com manchas/sujidades
Fachada: spots da escada sem funcionamento
INICIAL FINAL
https://photos.app.goo.gl/xyz
Lavabo: ralo da pia sujo; sifão com vazamento; torneira sem aquecimento
Fachada: todo o jardim sem manutenção; grama alta e danificada, vasos de plantas
removidos; irrigação instalada
MOV SERVIÇOS IMOBILIÁRIOS
Cozinha: forno com sujidades
CONSIDERAÇÕES FINAIS
Cozinha: isto não entra
`;

test('reconhece o laudo MOV/LAG', () => {
  assert.equal(ehLaudoMov(LAUDO), true);
  assert.equal(ehLaudoMov('Cliente: X\n1. Sala\n1.1 - Piso: riscado'), false);
});

test('só as divergências viram item; alterações do inquilino ficam de fora', () => {
  const it = parseVistoriaTexto(LAUDO);
  const textos = it.map((x) => `${x.ambiente}|${x.servico}`);
  assert.ok(!textos.some((t) => /gancho|cor da pintura/i.test(t)), 'alteração não pode virar item');
  assert.ok(!textos.some((t) => /não entra/.test(t)), 'nada depois de Considerações finais');
  assert.equal(it.diagnostico.alteracoes.length, 2);
  assert.deepEqual(it.diagnostico.naoLidas, []);
});

test('bloco Geral, ações separadas por ";" e linha quebrada', () => {
  const it = parseVistoriaTexto(LAUDO);
  const get = (amb) => it.filter((x) => x.ambiente === amb).map((x) => x.servico);
  assert.deepEqual(get('Geral'), ['Pintura nova com falhas na cobertura', 'Rodapés com manchas/sujidades']);
  assert.deepEqual(get('Lavabo'), ['Ralo da pia sujo', 'Sifão com vazamento', 'Torneira sem aquecimento']);
  assert.deepEqual(get('Fachada'), ['Spots da escada sem funcionamento', 'Todo o jardim sem manutenção', 'Grama alta e danificada, vasos de plantas removidos', 'Irrigação instalada']);
  assert.equal(it.length, 10);
});

test('endereço sem o código do imóvel', () => {
  assert.equal(extrairEnderecoVistoria(LAUDO), 'Rua Exemplo nº 10, Lote 1');
});

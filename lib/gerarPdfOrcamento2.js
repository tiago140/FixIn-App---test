import { rgb, StandardFonts } from 'pdf-lib';
import { EMPRESA_2 as EMPRESA } from './empresaConfig';
import { organizarSeguroFianca } from './seguroFianca';
import { fmtBRL, fmtDate, arredondarParaCima } from './format';
import { PAGE_W, PAGE_H, ML, MR, wrapText, criarDocumentoPadrao } from './pdfPadrao';

// ORÇAMENTO 2: segunda versão do orçamento, emitida pela segunda empresa do dono (EMPRESA_2), só gerada quando ele pede.
// Valores: cada linha (MO e MA) = valor final do orçamento oficial (com a margem) + ACRESCIMO_ORCAMENTO_2 %, arredondada para cima.
export const ACRESCIMO_ORCAMENTO_2 = 30;

export function valorOrcamento2(valorBase, margemPercentual) {
  const fatorMargem = 1 + (Number(margemPercentual) || 0) / 100;
  const final = arredondarParaCima((Number(valorBase) || 0) * fatorMargem); // valor final oficial da linha
  return arredondarParaCima(final * (1 + ACRESCIMO_ORCAMENTO_2 / 100));
}

export async function gerarPdfOrcamento2(orcamento, cliente, itensOriginais) {
  const itens = orcamento.seguro_fianca ? organizarSeguroFianca(itensOriginais) : itensOriginais;
  const doc = await criarDocumentoPadrao();
  const { pdfDoc } = doc;
  // Outra fonte (serifada), diferente do Poppins do orçamento oficial
  const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const fontBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const marinho = rgb(24 / 255, 47 / 255, 80 / 255);
  const verde = rgb(37 / 255, 55 / 255, 40 / 255);
  const cinza = rgb(0.4, 0.4, 0.4);
  const preto = rgb(0.1, 0.1, 0.1);
  const linha = rgb(0.85, 0.86, 0.83);

  const RODAPE_Y = 110;
  let page;
  let y;
  const largura = PAGE_W - ML - MR;

  function novaPagina(primeira) {
    page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - 36;
    if (!primeira) return;
    const x = ML;
    page.drawText(EMPRESA.nome, { x, y: y - 8, size: 17, font: fontBold, color: preto });
    page.drawText(EMPRESA.descricao.split('').join(' ').replace(/ {2}/g, '   '), { x, y: y - 27, size: 7, font: fontBold, color: verde });
    page.drawText(`CNPJ: ${EMPRESA.cnpj}`, { x, y: y - 40, size: 8.5, font: fontBold, color: preto });
    page.drawText(EMPRESA.endereco, { x, y: y - 52, size: 7, font: fontBold, color: cinza });
    y -= 84;
  }
  const garantir = (altura) => { if (y - altura < RODAPE_Y) novaPagina(false); };
  function texto(t, { f = font, size = 10, cor = preto, gap = 13, x = ML } = {}) {
    for (const l of wrapText(String(t || ''), f, size, largura - (x - ML))) {
      garantir(gap);
      page.drawText(l, { x, y, size, font: f, color: cor });
      y -= gap;
    }
  }

  novaPagina(true);
  texto(`Data do orçamento: ${fmtDate(orcamento.data_orcamento)}${orcamento.validade_dias ? ` · Válido por ${orcamento.validade_dias} dias após o envio.` : ''}`, { f: fontBold, size: 10.5, gap: 15 });
  if (cliente?.nome_empresa) texto(`Cliente: ${cliente.nome_empresa}`, { f: fontBold, size: 10.5, gap: 15 });
  texto(`Endereço: ${orcamento.endereco || ''}`, { f: fontBold, size: 10.5, gap: 15 });
  if (orcamento.garantia) texto(`Garantia: ${orcamento.garantia}`, { size: 10, gap: 14 });
  if (orcamento.prazo_execucao_dias) texto(`Prazo de execução: ${orcamento.prazo_execucao_dias} dias corridos`, { size: 10, gap: 14 });
  y -= 10;

  const grupos = [];
  for (const it of itens) {
    let g = grupos.find((x) => x.ambiente === it.ambiente);
    if (!g) { g = { ambiente: it.ambiente, itens: [] }; grupos.push(g); }
    g.itens.push(it);
  }
  let totalMO = 0, totalMA = 0;

  for (const g of grupos) {
    garantir(60);
    page.drawText(String(g.ambiente || 'Geral'), { x: ML, y, size: 11.5, font: fontBold, color: marinho });
    y -= 5;
    page.drawLine({ start: { x: ML, y }, end: { x: PAGE_W - MR, y }, thickness: 0.8, color: verde });
    y -= 14;
    let gMO = 0, gMA = 0;
    for (const it of g.itens) {
      const mo = valorOrcamento2(it.mo, orcamento.margem_percentual);
      const ma = valorOrcamento2(it.ma, orcamento.margem_percentual);
      gMO += mo; gMA += ma;
      garantir(52);
      texto(it.servico, { f: fontBold, size: 10.5, gap: 13.5 });
      if (it.descricao) texto(it.descricao, { size: 9.5, cor: cinza, gap: 12 });
      texto(`Valor: ${fmtBRL(mo + ma)}`, { f: fontBold, size: 10.5, gap: 13, cor: verde });
      y -= 5;
      page.drawLine({ start: { x: ML, y: y + 3 }, end: { x: PAGE_W - MR, y: y + 3 }, thickness: 0.4, color: linha });
      y -= 6;
    }
    totalMO += gMO; totalMA += gMA;
    y -= 12;
  }

  garantir(200);
  if (orcamento.forma_pagamento) {
    page.drawText('Formas de pagamento:', { x: ML, y, size: 11, font: fontBold, color: preto });
    y -= 15;
    texto(orcamento.forma_pagamento, { size: 11, gap: 14 });
  }
  // Total no fim da página, em letra preta normal
  const total = totalMO + totalMA;
  page.drawLine({ start: { x: ML, y: 92 }, end: { x: PAGE_W - MR, y: 92 }, thickness: 0.8, color: rgb(0.75, 0.75, 0.75) });
  page.drawText('TOTAL GERAL DA PROPOSTA', { x: ML, y: 70, size: 10.5, font: fontBold, color: preto });
  page.drawText(fmtBRL(total), { x: ML, y: 40, size: 24, font: fontBold, color: preto });
  const det = `Mão de obra ${fmtBRL(totalMO)}  |  Material ${fmtBRL(totalMA)}`;
  page.drawText(det, { x: PAGE_W - MR - font.widthOfTextAtSize(det, 10.5), y: 44, size: 10.5, font, color: preto });

  return Buffer.from(await pdfDoc.save());
}

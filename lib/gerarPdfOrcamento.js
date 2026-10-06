import { rgb } from 'pdf-lib';
import { EMPRESA } from './empresaConfig';
import { fmtBRL, fmtDate } from './format';
import { PAGE_W, PAGE_H, ML, MR, TOPO, RODAPE, wrapText, criarDocumentoPadrao, desenharCabecalho, desenharRodapeEmpresa } from './pdfPadrao';

const ALTURA_BLOCO_FINAL = 190; // reserva maior por causa da linha extra de MO/MA

export async function gerarPdfOrcamento(orcamento, cliente, itens) {
  const doc = await criarDocumentoPadrao();
  doc.referencia = { rotulo: orcamento.tipo === 'manutencao' ? 'ORÇAMENTO · MANUTENÇÃO' : 'ORÇAMENTO', numero: orcamento.numero };
  const { pdfDoc, font, fontBold } = doc;
  const { marinho, cinza, cinzaClaro, fundoAmbiente, preto } = doc.cores;

  let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let y = TOPO;

  function novaPagina() {
    page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    y = TOPO;
  }
  function garantir(altura) {
    if (y - altura < RODAPE) novaPagina();
  }

  y = desenharCabecalho(page, doc, y);

  const margem = Number(orcamento.margem_percentual) || 0;
  const fatorMargem = 1 + margem / 100;

  function campo(label, valor, larguraLabel) {
    page.drawText(label, { x: ML, y, size: 10.5, font: fontBold, color: preto });
    const linhas = wrapText(String(valor || ''), font, 10.5, PAGE_W - ML - MR - larguraLabel);
    linhas.forEach((l, i) => page.drawText(l, { x: ML + larguraLabel, y: y - i * 13, size: 10.5, font, color: preto }));
    y -= Math.max(14, linhas.length * 13);
  }

  campo('Data do orçamento:', fmtDate(orcamento.data_orcamento), 130);
  campo('Validade:', `${orcamento.validade_dias} dias`, 130);
  if (cliente?.nome_empresa) campo('Cliente:', cliente.nome_empresa, 130);
  campo('Endereço:', orcamento.endereco || '', 130);
  if (orcamento.garantia) campo('Garantia:', orcamento.garantia, 130);
  if (orcamento.prazo_execucao_dias) campo('Prazo de execução:', `${orcamento.prazo_execucao_dias} dias corridos`, 130);
  y -= 10;

  const grupos = [];
  for (const it of itens) {
    let grupo = grupos.find((g) => g.ambiente === it.ambiente);
    if (!grupo) {
      grupo = { ambiente: it.ambiente, itens: [] };
      grupos.push(grupo);
    }
    grupo.itens.push(it);
  }

  let totalGeral = 0;
  let totalMO = 0;
  let totalMA = 0;

  // calcula a altura (em pontos) que um item vai ocupar, pra decidir a quebra de página
  function alturaItem(it) {
    const moExibido = (Number(it.mo) || 0) * fatorMargem;
    const maExibido = (Number(it.ma) || 0) * fatorMargem;
    const valorTexto = `MO ${fmtBRL(moExibido)} | MA ${fmtBRL(maExibido)} | Total ${fmtBRL(moExibido + maExibido)}`;
    const larguraValor = fontBold.widthOfTextAtSize(valorTexto, 9);
    const tituloTexto = `${it.servico}${it.descricao ? ': ' + it.descricao : ''}`;
    const ambientePrefixo = `${it.ambiente || ''}  `;
    const larguraPrefixo = fontBold.widthOfTextAtSize(ambientePrefixo, 10);
    const larguraDisponivel = PAGE_W - ML - MR - 16 - larguraValor - 10;
    const linhas = wrapText(tituloTexto, font, 10, Math.max(60, larguraDisponivel - larguraPrefixo));
    return linhas.length * 13 + 8;
  }

  for (const grupo of grupos) {
    // regra: o título do ambiente nunca fica sozinho no fim da página — reserva espaço pro título + primeiro item juntos
    garantir(28 + alturaItem(grupo.itens[0]));
    page.drawRectangle({ x: ML, y: y - 6, width: PAGE_W - ML - MR, height: 20, color: fundoAmbiente });
    page.drawText(grupo.ambiente.toUpperCase(), { x: ML + 6, y: y - 1, size: 10.5, font: fontBold, color: marinho });
    y -= 24;

    for (let idx = 0; idx < grupo.itens.length; idx++) {
      const it = grupo.itens[idx];
      const moExibido = (Number(it.mo) || 0) * fatorMargem;
      const maExibido = (Number(it.ma) || 0) * fatorMargem;
      const itemTotal = moExibido + maExibido;
      totalGeral += itemTotal;
      totalMO += moExibido;
      totalMA += maExibido;

      const valorTexto = `MO ${fmtBRL(moExibido)} | MA ${fmtBRL(maExibido)} | Total ${fmtBRL(itemTotal)}`;
      const larguraValor = fontBold.widthOfTextAtSize(valorTexto, 9);
      const tituloTexto = `${it.servico}${it.descricao ? ': ' + it.descricao : ''}`;
      const ambientePrefixo = `${it.ambiente || ''}  `;
      const larguraPrefixo = fontBold.widthOfTextAtSize(ambientePrefixo, 10);
      const larguraDisponivel = PAGE_W - ML - MR - 16 - larguraValor - 10;

      const linhas = wrapText(tituloTexto, font, 10, Math.max(60, larguraDisponivel - larguraPrefixo));
      garantir(linhas.length * 13 + 8);

      page.drawText('•', { x: ML + 2, y, size: 10, font, color: cinza });
      page.drawText(ambientePrefixo, { x: ML + 12, y, size: 10, font: fontBold, color: preto });
      page.drawText(linhas[0] || '', { x: ML + 12 + larguraPrefixo, y, size: 10, font, color: preto });
      for (let li = 1; li < linhas.length; li++) {
        page.drawText(linhas[li], { x: ML + 12, y: y - li * 13, size: 10, font, color: preto });
      }
      page.drawText(valorTexto, { x: PAGE_W - MR - larguraValor, y, size: 9, font: fontBold, color: rgb(0.3, 0.3, 0.3) });
      y -= linhas.length * 13 + 6;

      if (idx < grupo.itens.length - 1) {
        page.drawLine({ start: { x: ML + 8, y: y + 3 }, end: { x: PAGE_W - MR, y: y + 3 }, thickness: 0.4, color: rgb(0.92, 0.92, 0.92) });
      }
    }
    y -= 8;
  }

  if (y > RODAPE + ALTURA_BLOCO_FINAL) {
    y = RODAPE + ALTURA_BLOCO_FINAL;
  } else if (y < RODAPE + 20) {
    novaPagina();
    y = RODAPE + ALTURA_BLOCO_FINAL;
  }

  page.drawLine({ start: { x: ML, y }, end: { x: PAGE_W - MR, y }, thickness: 1, color: rgb(0.75, 0.75, 0.75) });
  y -= 24;
  page.drawText(`Total > ${fmtBRL(totalGeral)} (COM MATERIAL INCLUSO)`, { x: ML, y, size: 15, font: fontBold, color: marinho });
  y -= 15;
  page.drawText(`Mão de obra: ${fmtBRL(totalMO)}    |    Material: ${fmtBRL(totalMA)}`, { x: ML, y, size: 8.5, font: fontBold, color: preto });
  y -= 20;

  page.drawText('Formas de pagamento:', { x: ML, y, size: 10.5, font: fontBold, color: preto });
  y -= 15;
  page.drawText(orcamento.forma_pagamento || '', { x: ML, y, size: 10.5, font, color: preto });
  y -= 22;

  page.drawText(`Para dúvidas entre em contato: ${EMPRESA.telefone}`, { x: ML, y, size: 10.5, font: fontBold, color: preto });
  desenharRodapeEmpresa(page, doc);

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}

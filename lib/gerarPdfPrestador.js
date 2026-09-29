import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import fs from 'fs';
import path from 'path';
import { EMPRESA } from './empresaConfig';
import { fmtBRL, fmtDate } from './format';

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const ML = 45;
const MR = 45;
const TOPO = PAGE_H - 32;
const RODAPE = 46;
const ALTURA_BLOCO_FINAL = 120;

function wrapText(text, font, size, maxWidth) {
  const palavras = (text || '').split(/\s+/).filter(Boolean);
  const linhas = [];
  let linhaAtual = '';
  for (const palavra of palavras) {
    const teste = linhaAtual ? linhaAtual + ' ' + palavra : palavra;
    if (font.widthOfTextAtSize(teste, size) > maxWidth && linhaAtual) {
      linhas.push(linhaAtual);
      linhaAtual = palavra;
    } else {
      linhaAtual = teste;
    }
  }
  if (linhaAtual) linhas.push(linhaAtual);
  return linhas;
}

// PDF interno — só o dono gera. Mostra os custos SEM a margem (o que cabe ao prestador),
// nunca o preço cobrado da imobiliária. Não é o orçamento oficial.
export async function gerarPdfPrestador(orcamento, prestador, itens) {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const regularBytes = fs.readFileSync(path.join(process.cwd(), 'public', 'poppins-regular.ttf'));
  const boldBytes = fs.readFileSync(path.join(process.cwd(), 'public', 'poppins-bold.ttf'));
  const font = await pdfDoc.embedFont(regularBytes, { subset: true });
  const fontBold = await pdfDoc.embedFont(boldBytes, { subset: true });

  const marinho = rgb(24 / 255, 47 / 255, 80 / 255);
  const cinza = rgb(0.35, 0.35, 0.35);
  const cinzaClaro = rgb(0.82, 0.82, 0.82);
  const fundoAmbiente = rgb(0.957, 0.961, 0.941);
  const preto = rgb(0.1, 0.1, 0.1);

  let logoImage = null;
  try {
    const logoBytes = fs.readFileSync(path.join(process.cwd(), 'public', 'logo-fixin.png'));
    logoImage = await pdfDoc.embedPng(logoBytes);
  } catch (e) {
    logoImage = null;
  }

  let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let y = TOPO;

  function novaPagina() {
    page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    y = TOPO;
  }
  function garantir(altura) {
    if (y - altura < RODAPE) novaPagina();
  }

  if (logoImage) {
    const escala = 92 / logoImage.width;
    const w = logoImage.width * escala;
    const h = logoImage.height * escala;
    page.drawImage(logoImage, { x: ML, y: y - h, width: w, height: h });
  }
  page.drawText(EMPRESA.cnpj, { x: ML, y: y - 62, size: 8, font: fontBold, color: preto });
  y -= 78;

  page.drawText('ORDEM DE SERVIÇO — USO INTERNO', { x: ML, y, size: 13, font: fontBold, color: marinho });
  y -= 12;
  page.drawText('Documento interno para o prestador — não é o orçamento enviado à imobiliária.', { x: ML, y, size: 8, font, color: cinza });
  y -= 12;
  page.drawLine({ start: { x: ML, y }, end: { x: PAGE_W - MR, y }, thickness: 0.6, color: cinzaClaro });
  y -= 18;

  function campo(label, valor, larguraLabel) {
    page.drawText(label, { x: ML, y, size: 10.5, font: fontBold, color: preto });
    const linhas = wrapText(String(valor || ''), font, 10.5, PAGE_W - ML - MR - larguraLabel);
    linhas.forEach((l, i) => page.drawText(l, { x: ML + larguraLabel, y: y - i * 13, size: 10.5, font, color: preto }));
    y -= Math.max(14, linhas.length * 13);
  }

  campo('Data:', fmtDate(orcamento.data_orcamento), 130);
  campo('Endereço:', orcamento.endereco || '', 130);
  if (prestador?.nome) campo('Prestador:', prestador.nome, 130);
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

  function alturaItem(it) {
    const valorTexto = `Total ${fmtBRL((Number(it.mo) || 0) + (Number(it.ma) || 0))}`;
    const larguraValor = fontBold.widthOfTextAtSize(valorTexto, 9);
    const tituloTexto = `${it.servico}${it.descricao ? ': ' + it.descricao : ''}`;
    const ambientePrefixo = `${it.ambiente || ''}  `;
    const larguraPrefixo = fontBold.widthOfTextAtSize(ambientePrefixo, 10);
    const larguraDisponivel = PAGE_W - ML - MR - 16 - larguraValor - 10;
    const linhas = wrapText(tituloTexto, font, 10, Math.max(60, larguraDisponivel - larguraPrefixo));
    return linhas.length * 13 + 8;
  }

  for (const grupo of grupos) {
    garantir(28 + alturaItem(grupo.itens[0]));
    page.drawRectangle({ x: ML, y: y - 6, width: PAGE_W - ML - MR, height: 20, color: fundoAmbiente });
    page.drawText(grupo.ambiente.toUpperCase(), { x: ML + 6, y: y - 1, size: 10.5, font: fontBold, color: marinho });
    y -= 24;

    for (let idx = 0; idx < grupo.itens.length; idx++) {
      const it = grupo.itens[idx];
      const itemTotal = (Number(it.mo) || 0) + (Number(it.ma) || 0);
      totalGeral += itemTotal;

      const valorTexto = `Total ${fmtBRL(itemTotal)}`;
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
  page.drawText(`Valor a pagar ao prestador > ${fmtBRL(totalGeral)}`, { x: ML, y, size: 15, font: fontBold, color: marinho });
  y -= 18;
  page.drawText('Documento de uso interno da FixIn Reformas — não enviar para a imobiliária ou cliente final.', { x: ML, y, size: 9, font, color: cinza });

  page.drawText(EMPRESA.cnpj, { x: ML, y: 22, size: 7.5, font, color: rgb(0.45, 0.45, 0.45) });

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}

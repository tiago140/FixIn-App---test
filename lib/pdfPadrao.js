import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import fs from 'fs';
import path from 'path';
import { EMPRESA } from './empresaConfig';

// Peças COMUNS a todos os PDFs da FixIn (orçamento, laudo...): página, margens, fontes, cores, logo, cabeçalho e rodapé.
// Qualquer mudança de identidade visual é feita aqui e vale para todos os documentos.
export const PAGE_W = 595.28;
export const PAGE_H = 841.89;
export const ML = 45;
export const MR = 45;
export const TOPO = PAGE_H - 32;
export const RODAPE = 46;

export function wrapText(text, font, size, maxWidth) {
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

export async function criarDocumentoPadrao() {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const regularBytes = fs.readFileSync(path.join(process.cwd(), 'public', 'poppins-regular.ttf'));
  const boldBytes = fs.readFileSync(path.join(process.cwd(), 'public', 'poppins-bold.ttf'));
  const font = await pdfDoc.embedFont(regularBytes, { subset: true });
  const fontBold = await pdfDoc.embedFont(boldBytes, { subset: true });

  let logoImage = null;
  try {
    const logoBytes = fs.readFileSync(path.join(process.cwd(), 'public', 'logo-fixin.png'));
    logoImage = await pdfDoc.embedPng(logoBytes);
  } catch (e) {
    logoImage = null;
  }

  return {
    pdfDoc, font, fontBold, logoImage,
    cores: {
      marinho: rgb(24 / 255, 47 / 255, 80 / 255),
      cinza: rgb(0.35, 0.35, 0.35),
      cinzaClaro: rgb(0.82, 0.82, 0.82),
      fundoAmbiente: rgb(0.957, 0.961, 0.941),
      preto: rgb(0.1, 0.1, 0.1),
    },
  };
}

// Cabeçalho: logo + CNPJ embaixo + linha cinza. Devolve o novo "y" (onde o conteúdo começa).
export function desenharCabecalho(page, doc, y) {
  const { logoImage, fontBold, cores } = doc;
  if (logoImage) {
    const escala = 92 / logoImage.width;
    const w = logoImage.width * escala;
    const h = logoImage.height * escala;
    page.drawImage(logoImage, { x: ML, y: y - h, width: w, height: h });
  }
  page.drawText(EMPRESA.cnpj, { x: ML, y: y - 62, size: 8, font: fontBold, color: cores.preto });
  // Referência do sistema (nº do orçamento / laudo) no canto direito do cabeçalho
  if (doc.referencia?.numero) {
    const { rotulo = '', numero } = doc.referencia;
    const wNum = fontBold.widthOfTextAtSize(numero, 18);
    page.drawText(numero, { x: PAGE_W - MR - wNum, y: y - 28, size: 18, font: fontBold, color: cores.marinho });
    if (rotulo) {
      const wRot = doc.font.widthOfTextAtSize(rotulo, 8.5);
      page.drawText(rotulo, { x: PAGE_W - MR - wRot, y: y - 42, size: 8.5, font: doc.font, color: cores.cinza });
    }
  }
  y -= 78;
  page.drawLine({ start: { x: ML, y }, end: { x: PAGE_W - MR, y }, thickness: 0.6, color: cores.cinzaClaro });
  return y - 18;
}

// Rodapé: CNPJ e endereço da empresa, em cinza, bem embaixo da página.
export function desenharRodapeEmpresa(page, doc) {
  page.drawText(`${EMPRESA.cnpj}   ${EMPRESA.endereco}`, { x: ML, y: 22, size: 7.5, font: doc.font, color: rgb(0.45, 0.45, 0.45) });
}

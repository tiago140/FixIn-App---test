import { EMPRESA } from './empresaConfig';
import { fmtDate } from './format';
import { parseTextoLaudo } from './laudoTexto';
import { rgb } from 'pdf-lib';
import { PAGE_W, PAGE_H, ML, MR, TOPO, RODAPE, wrapText, criarDocumentoPadrao, desenharCabecalho, desenharRodapeEmpresa } from './pdfPadrao';

// Laudo de inspeção: MESMO cabeçalho, logo, fontes, cores e rodapé do orçamento; no lugar da tabela de itens, escrita livre + fotos.
// fotos = [{ buffer, legenda }] (JPEG ou PNG, já na ordem). Devolve um Buffer com o PDF.
export async function gerarPdfLaudo({ laudo, cliente, orcamentoNumero, fotos = [] }) {
  const doc = await criarDocumentoPadrao();
  const { pdfDoc, font, fontBold } = doc;
  const { marinho, cinza, cinzaClaro, fundoAmbiente, preto } = doc.cores;

  // Poppins não tem todos os símbolos: o que não existir vira "?" em vez de derrubar o PDF.
  const suportados = new Set(font.getCharacterSet());
  const limpar = (s) => Array.from(String(s ?? '').replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/\u00A0/g, ' ')).map((c) => (suportados.has(c.codePointAt(0)) || c === ' ' ? c : '?')).join('');

  const quebrarLongas = (texto, fonte, tam, max) => String(texto).split(/\s+/).filter(Boolean).flatMap((palavra) => {
    if (fonte.widthOfTextAtSize(palavra, tam) <= max) return [palavra];
    const pedacos = [];
    let atual = '';
    for (const c of Array.from(palavra)) {
      if (fonte.widthOfTextAtSize(atual + c, tam) > max && atual) { pedacos.push(atual); atual = c; } else atual += c;
    }
    if (atual) pedacos.push(atual);
    return pedacos;
  }).join(' ');
  const quebrar = (texto, fonte, tam, max) => wrapText(quebrarLongas(limpar(texto), fonte, tam, max), fonte, tam, max);

  let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let y = TOPO;
  const novaPagina = () => { page = pdfDoc.addPage([PAGE_W, PAGE_H]); y = TOPO; };
  const garantir = (altura) => { if (y - altura < RODAPE) novaPagina(); };

  y = desenharCabecalho(page, doc, y);

  function campo(label, valor, larguraLabel = 130) {
    page.drawText(label, { x: ML, y, size: 10.5, font: fontBold, color: preto });
    const linhas = quebrar(valor, font, 10.5, PAGE_W - ML - MR - larguraLabel);
    linhas.forEach((l, i) => page.drawText(l, { x: ML + larguraLabel, y: y - i * 13, size: 10.5, font, color: preto }));
    y -= Math.max(14, linhas.length * 13);
  }
  campo('Laudo nº:', laudo.numero);
  campo('Data da inspeção:', fmtDate(laudo.data_inspecao));
  if (cliente?.nome_empresa) campo('Cliente:', cliente.nome_empresa);
  campo('Endereço:', laudo.endereco || '');
  if (orcamentoNumero) campo('Orçamento:', orcamentoNumero);
  y -= 8;

  page.drawText('LAUDO DE INSPEÇÃO', { x: ML, y: y - 8, size: 15, font: fontBold, color: marinho });
  y -= 22;
  if (laudo.titulo && laudo.titulo.trim() && laudo.titulo.trim().toLowerCase() !== 'laudo de inspeção') {
    page.drawText(limpar(laudo.titulo.trim()), { x: ML, y: y - 4, size: 10.5, font, color: cinza });
    y -= 16;
  }
  y -= 8;

  // ----- texto -----
  const barraTitulo = (texto) => {
    y -= 6;
    // título comprido quebra em mais de uma linha (a faixa cresce junto), em vez de passar da margem
    const linhas = quebrar(String(texto).toUpperCase(), fontBold, 10.5, PAGE_W - ML - MR - 12);
    const extra = (linhas.length - 1) * 13;
    garantir(46 + extra);
    page.drawRectangle({ x: ML, y: y - 6 - extra, width: PAGE_W - ML - MR, height: 20 + extra, color: fundoAmbiente });
    linhas.forEach((l, i) => page.drawText(l, { x: ML + 6, y: y - 1 - i * 13, size: 10.5, font: fontBold, color: marinho }));
    y -= 26 + extra;
  };

  const texto = (laudo.texto_tecnico && laudo.texto_tecnico.trim()) || laudo.descricao_original || '';
  for (const b of parseTextoLaudo(texto)) {
    if (b.tipo === 'titulo') {
      barraTitulo(b.texto);
    } else if (b.tipo === 'topico') {
      const linhas = quebrar(b.texto, font, 10.5, PAGE_W - ML - MR - 14);
      linhas.forEach((l, i) => {
        garantir(15);
        if (i === 0) page.drawText('•', { x: ML + 3, y, size: 10.5, font, color: cinza });
        page.drawText(l, { x: ML + 14, y, size: 10.5, font, color: preto });
        y -= 14;
      });
      y -= 3;
    } else {
      const linhas = quebrar(b.texto, font, 10.5, PAGE_W - ML - MR);
      linhas.forEach((l) => {
        garantir(15);
        page.drawText(l, { x: ML, y, size: 10.5, font, color: preto });
        y -= 14;
      });
      y -= 7;
    }
  }

  // ----- fotos (2 por linha) -----
  if (fotos.length) {
    y -= 6;
    garantir(40 + 210);
    barraTitulo('Registro fotográfico');
    const gap = 16;
    const larg = (PAGE_W - ML - MR - gap) / 2;
    const altImg = 172;
    for (let i = 0; i < fotos.length; i += 2) {
      const par = fotos.slice(i, i + 2);
      const embutidas = [];
      for (const f of par) {
        let img;
        try { img = await pdfDoc.embedJpg(f.buffer); } catch (e) { img = await pdfDoc.embedPng(f.buffer); }
        embutidas.push(img);
      }
      const legendas = par.map((f) => quebrar(f.legenda || '', font, 8.5, larg).slice(0, 3));
      const altLegenda = 12 + Math.max(...legendas.map((l) => l.length)) * 11;
      const altLinha = altImg + 8 + altLegenda + 12;
      garantir(altLinha);
      par.forEach((f, k) => {
        const x = ML + k * (larg + gap);
        const img = embutidas[k];
        const escala = Math.min(larg / img.width, altImg / img.height);
        const w = img.width * escala;
        const h = img.height * escala;
        page.drawRectangle({ x, y: y - altImg, width: larg, height: altImg, borderColor: cinzaClaro, borderWidth: 0.5, color: rgb(0.985, 0.985, 0.98) });
        page.drawImage(img, { x: x + (larg - w) / 2, y: y - altImg + (altImg - h) / 2, width: w, height: h });
        page.drawText(`Foto ${i + k + 1}`, { x, y: y - altImg - 12, size: 8.5, font: fontBold, color: preto });
        legendas[k].forEach((l, li) => page.drawText(l, { x, y: y - altImg - 23 - li * 11, size: 8.5, font, color: cinza }));
      });
      y -= altLinha;
    }
  }

  // ----- fecho -----
  garantir(44);
  y -= 6;
  page.drawLine({ start: { x: ML, y }, end: { x: PAGE_W - MR, y }, thickness: 1, color: rgb(0.75, 0.75, 0.75) });
  y -= 22;
  page.drawText(`Para dúvidas entre em contato: ${EMPRESA.telefone}`, { x: ML, y, size: 10.5, font: fontBold, color: preto });

  // rodapé em TODAS as páginas (o laudo costuma ter várias): endereço da empresa + "Página X de Y"
  const paginas = pdfDoc.getPages();
  paginas.forEach((p, idx) => {
    desenharRodapeEmpresa(p, doc);
    const t = `Página ${idx + 1} de ${paginas.length}`;
    p.drawText(t, { x: PAGE_W - MR - font.widthOfTextAtSize(t, 7.5), y: 22, size: 7.5, font, color: rgb(0.45, 0.45, 0.45) });
  });

  return Buffer.from(await pdfDoc.save());
}

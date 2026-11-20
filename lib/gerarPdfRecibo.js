import { rgb } from 'pdf-lib';
import { PDFDocument } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import fs from 'fs';
import path from 'path';
import { valorExtenso } from './valorExtenso';
import { fmtBRL } from './format';

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export const dataPorExtenso = (iso) => { const [a, m, d] = String(iso).split('-').map(Number); return `${d} de ${MESES[m - 1]} de ${a}`; };

// Recibo no modelo da FixIn: logo, título, texto com valor por extenso e destaques em negrito, cidade/data e dados da empresa.
export async function gerarPdfRecibo({ titulo, recebedor, pagador, valor, descricao, detalhe, data, cidade, empresa, endereco }) {
  const W = 841.89, H = 420;
  const pdf = await PDFDocument.create(); pdf.registerFontkit(fontkit);
  const reg = await pdf.embedFont(fs.readFileSync(path.join(process.cwd(), 'public', 'poppins-regular.ttf')), { subset: true });
  const bold = await pdf.embedFont(fs.readFileSync(path.join(process.cwd(), 'public', 'poppins-bold.ttf')), { subset: true });
  const logo = await pdf.embedPng(fs.readFileSync(path.join(process.cwd(), 'public', 'logo-fixin.png'))).catch(() => null);
  const page = pdf.addPage([W, H]);
  const preto = rgb(0.07, 0.07, 0.07), cinza = rgb(0.3, 0.3, 0.3);
  const M = 45;

  let y = H - 35;
  if (logo) { const h = 62, w = (logo.width / logo.height) * h; page.drawImage(logo, { x: M, y: y - h, width: w, height: h }); }
  const tit = String(titulo || 'RECIBO DE VALOR RECEBIDO').toUpperCase();
  page.drawText(tit, { x: M + 215, y: y - 40, size: 17, font: bold, color: preto });

  // texto com trechos em negrito
  const v = Number(valor) || 0;
  const segs = [];
  const add = (t, b = false) => { String(t).split(/(\s+)/).forEach((p) => p && segs.push({ t: p, b })); };
  add(`A empresa ${recebedor || 'Fixin Reformas'}, recebeu${pagador ? ' de ' + pagador : ''} o valor de ${fmtBRL(v).replace(/ /g, ' ')} (`);
  add(valorExtenso(v), true); add(')');
  if (descricao) { add(`, correspondente ${descricao}`); }
  if (detalhe) { add(' ('); add(detalhe, true); add(')'); }
  add('.');
  const size = 13, lh = 21, maxW = W - 2 * M;
  let x = M; y = H - 135;
  for (const s of segs) {
    const f = s.b ? bold : reg; const w = f.widthOfTextAtSize(s.t, size);
    if (/^\s+$/.test(s.t)) { if (x > M) x += w; continue; }
    if (x + w > M + maxW && x > M) { x = M; y -= lh; }
    page.drawText(s.t, { x, y, size, font: f, color: preto }); x += w;
  }

  const dt = `${cidade || 'Sorocaba'}, ${dataPorExtenso(data)}`;
  const wd = reg.widthOfTextAtSize(dt, 10.5);
  page.drawText(dt, { x: W - M - wd, y: 120, size: 10.5, font: reg, color: preto });
  const nome = empresa || 'Fixin Gestão de Serviços Imobiliarios LTDA';
  const wn = bold.widthOfTextAtSize(nome, 11);
  page.drawText(nome, { x: W - M - wn, y: 70, size: 11, font: bold, color: preto });
  const end = endereco || 'Rua Miranda Azevedo 304, centro - Sorocaba';
  const we = reg.widthOfTextAtSize(end, 10);
  page.drawText(end, { x: W - M - we, y: 53, size: 10, font: reg, color: cinza });
  return Buffer.from(await pdf.save());
}

import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { createAdminClient } from '@/lib/supabase/admin';
import { BUCKET_OS } from '@/lib/ordensArquivos';
import { fmtBRL } from '@/lib/format';
import { totalItensOS } from '@/lib/ordensStatus';

const fmtDH = (iso) => (iso ? new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }) : '—');
const fmtD = (iso) => (iso ? new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '—');

// Impressão digital do laudo: muda se qualquer dado, o texto ou a assinatura mudar.
export function hashLaudo({ osNumero, endereco, nome, doc, obs, assinaturaPng, quando }) {
  return createHash('sha256').update(JSON.stringify([osNumero, endereco, nome, doc, obs || '', createHash('sha256').update(assinaturaPng).digest('hex'), quando])).digest('hex');
}

// Reduz a foto para caber no PDF sem ficar pesado (o original continua guardado).
async function prepararFoto(buf) {
  try {
    const sharp = (await import('sharp')).default;
    return await sharp(buf).rotate().resize({ width: 900, height: 900, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 74 }).toBuffer();
  } catch (e) { return buf; }
}

const ETAPAS = [['antes', 'Início da obra (antes)'], ['durante', 'Durante a execução'], ['depois', 'Conclusão (depois)']];

export async function gerarPdfLaudoFinal(osId) {
  const admin = createAdminClient();
  const { data: os } = await admin.from('ordens_servico').select('*, prestadores(nome, cpf, cnpj, razao_social, telefone), os_itens(*)').eq('id', osId).maybeSingle();
  if (!os) return null;
  const { data: laudo } = await admin.from('os_laudos_finalizacao').select('*').eq('os_id', osId).eq('rodada', os.rodada || 0).maybeSingle();
  if (!laudo) return null;
  const [{ data: orc }, { data: cli }, { data: fotos }] = await Promise.all([
    os.orcamento_id ? admin.from('orcamentos').select('numero, garantia, prazo_execucao_dias').eq('id', os.orcamento_id).maybeSingle() : { data: null },
    os.cliente_id ? admin.from('clientes').select('nome_empresa, nome').eq('id', os.cliente_id).maybeSingle() : { data: null },
    admin.from('os_fotos').select('path, tipo, legenda, criado_em').eq('os_id', osId).eq('rodada', os.rodada || 0).order('criado_em', { ascending: true }).limit(60),
  ]);
  const itens = (os.os_itens || []).sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
  const prest = os.prestadores || {};

  const pdf = await PDFDocument.create(); pdf.registerFontkit(fontkit);
  pdf.setTitle(`Laudo de finalização ${os.numero}`); pdf.setAuthor('FixIn Reformas');
  const pub = (f) => fs.readFileSync(path.join(process.cwd(), 'public', f));
  const reg = await pdf.embedFont(pub('poppins-regular.ttf'), { subset: true });
  const bold = await pdf.embedFont(pub('poppins-bold.ttf'), { subset: true });
  const logoB = await pdf.embedPng(pub('logo-fixin-horizontal-branco-pdf.png')).catch(() => null);
  const logoT = await pdf.embedPng(pub('logo-fixin-horizontal-pdf.png')).catch(() => null);
  const W = 595.28, H = 841.89, M = 44, LW = W - M * 2;
  const marinho = rgb(0.094, 0.184, 0.314), verde = rgb(0.12, 0.55, 0.36), cinza = rgb(0.4, 0.42, 0.47), preto = rgb(0.1, 0.1, 0.12), fundo = rgb(0.955, 0.962, 0.975), linha = rgb(0.85, 0.87, 0.91);
  const paginas = [];
  let page, y;
  const nova = (primeira = false) => {
    page = pdf.addPage([W, H]); paginas.push(page);
    if (primeira) {
      page.drawRectangle({ x: 0, y: H - 118, width: W, height: 118, color: marinho });
      page.drawRectangle({ x: 0, y: H - 122, width: W, height: 4, color: verde });
      if (logoB) { const h = 62, w = (logoB.width / logoB.height) * h; page.drawImage(logoB, { x: M, y: H - 88, width: w, height: h }); }
      page.drawText('LAUDO DE FINALIZAÇÃO', { x: W - M - bold.widthOfTextAtSize('LAUDO DE FINALIZAÇÃO', 17), y: H - 58, size: 17, font: bold, color: rgb(1, 1, 1) });
      const sub = `Ordem ${os.numero}${orc?.numero ? ' · Orçamento ' + orc.numero : ''}`;
      page.drawText(sub, { x: W - M - reg.widthOfTextAtSize(sub, 10), y: H - 78, size: 10, font: reg, color: rgb(0.85, 0.89, 0.95) });
      const em = `Emitido em ${fmtDH(laudo.criado_em)}`;
      page.drawText(em, { x: W - M - reg.widthOfTextAtSize(em, 8.5), y: H - 95, size: 8.5, font: reg, color: rgb(0.7, 0.77, 0.87) });
      const selo='SERVIÇO CONCLUÍDO', sw=bold.widthOfTextAtSize(selo,8)+20;
      page.drawRectangle({ x: M, y: H - 112, width: sw, height: 15, color: verde });
      page.drawText(selo, { x: M + 10, y: H - 108, size: 8, font: bold, color: rgb(1,1,1) });
      y = H - 122 - 24;
    } else {
      page.drawRectangle({ x: 0, y: H - 34, width: W, height: 34, color: marinho });
      page.drawText(`Laudo de finalização · ${os.numero}`, { x: M, y: H - 22, size: 9, font: bold, color: rgb(1, 1, 1) });
      y = H - 34 - 24;
    }
  };
  nova(true);
  const garante = (h) => { if (y - h < M + 28) nova(); };
  const quebra = (t, f, s, w) => { const out = []; for (const par of String(t || '').split('\n')) { let l = ''; for (const p of par.split(/\s+/)) { const x = l ? l + ' ' + p : p; if (f.widthOfTextAtSize(x, s) > w && l) { out.push(l); l = p; } else l = x; } out.push(l); } return out; };
  const texto = (t, { f = reg, s = 10, c = preto, w = LW, x = M, gap = 4 } = {}) => { for (const l of quebra(t, f, s, w)) { garante(s + gap); page.drawText(l, { x, y: y - s, size: s, font: f, color: c }); y -= s + gap; } };
  const secao = (t) => { garante(40); y -= 6; page.drawRectangle({ x: M, y: y - 14, width: 4, height: 14, color: verde }); page.drawText(t.toUpperCase(), { x: M + 11, y: y - 11, size: 10, font: bold, color: marinho }); y -= 26; };

  // faixa de destaques
  {
    const dias = os.iniciada_em ? Math.max(1, Math.round((new Date(os.concluido_em || laudo.criado_em) - new Date(os.iniciada_em)) / 86400000)) : null;
    const k = [['Valor do serviço', fmtBRL(totalItensOS(itens))], ['Prazo de execução', dias ? `${dias} dia${dias > 1 ? 's' : ''}` : '—'], ['Fotos registradas', String((fotos || []).length)]];
    const kw = (LW - 20) / 3;
    k.forEach(([t, v], i) => {
      const x = M + i * (kw + 10);
      page.drawRectangle({ x, y: y - 46, width: kw, height: 46, color: fundo, borderColor: linha, borderWidth: 0.7 });
      page.drawRectangle({ x, y: y - 46, width: 3, height: 46, color: verde });
      page.drawText(t.toUpperCase(), { x: x + 12, y: y - 15, size: 7, font: bold, color: cinza });
      page.drawText(v, { x: x + 12, y: y - 36, size: 15, font: bold, color: marinho });
    });
    y -= 62;
  }

  // cartão de dados em duas colunas
  secao('Dados do serviço');
  const cel = [
    ['Imóvel', os.endereco], ['Cliente', cli?.nome_empresa || cli?.nome],
    ['Prestador', prest.razao_social ? `${prest.nome} · ${prest.razao_social}` : prest.nome], ['Documento', prest.cnpj || prest.cpf || laudo.assinante_doc],
    ['Ordem aceita em', fmtD(os.aceito_em)], ['Obra iniciada em', fmtD(os.iniciada_em)],
    ['Concluída em', fmtD(os.concluido_em || laudo.criado_em)], ['Garantia', orc?.garantia || 'Conforme combinado'],
  ].filter(([, v]) => v);
  const cw = (LW - 10) / 2;
  const alturas = []; for (let i = 0; i < cel.length; i += 2) alturas.push(Math.max(...cel.slice(i, i + 2).map(([, v]) => quebra(v, reg, 10, cw - 20).length)) * 13 + 30);
  const total = alturas.reduce((a, b) => a + b, 0);
  garante(Math.min(total, 200));
  page.drawRectangle({ x: M, y: y - Math.min(total, y - M - 30), width: LW, height: Math.min(total, y - M - 30), color: fundo, borderColor: linha, borderWidth: 0.7 });
  let yy = y;
  for (let i = 0, r = 0; i < cel.length; i += 2, r++) {
    cel.slice(i, i + 2).forEach(([k, v], j) => {
      const x = M + 10 + j * (cw + 10);
      page.drawText(k.toUpperCase(), { x, y: yy - 16, size: 7.5, font: bold, color: cinza });
      quebra(v, reg, 10, cw - 20).forEach((l, n) => page.drawText(l, { x, y: yy - 29 - n * 13, size: 10, font: reg, color: preto }));
    });
    yy -= alturas[r];
  }
  y = yy - 10;

  if (itens.length) {
    secao('Serviços executados');
    for (const i of itens) {
      const v = (Number(i.mo) || 0) + (Number(i.ma) || 0);
      garante(34); const topo = y;
      texto(`${i.ambiente ? i.ambiente + ' · ' : ''}${i.servico}`, { f: bold, s: 10, w: LW - 90, gap: 2 });
      if (i.descricao) texto(i.descricao, { s: 9, c: cinza, w: LW - 90, gap: 2 });
      page.drawText(fmtBRL(v), { x: W - M - reg.widthOfTextAtSize(fmtBRL(v), 10), y: topo - 10, size: 10, font: reg, color: preto });
      y -= 3; page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.4, color: linha }); y -= 5;
    }
    garante(24); const t = fmtBRL(totalItensOS(itens));
    page.drawText('Valor total do serviço', { x: M, y: y - 12, size: 10, font: bold, color: marinho });
    page.drawText(t, { x: W - M - bold.widthOfTextAtSize(t, 11), y: y - 12, size: 11, font: bold, color: marinho }); y -= 26;
  }

  if (laudo.observacoes || os.conclusao_obs) { secao('Observações do prestador'); texto([os.conclusao_obs, laudo.observacoes].filter(Boolean).join('\n')); }

  // fotos por etapa
  const porEtapa = {}; for (const f of fotos || []) (porEtapa[f.tipo] = porEtapa[f.tipo] || []).push(f);
  let temFoto = false;
  for (const [tipo, titulo] of ETAPAS) {
    const lista = (porEtapa[tipo] || []).slice(0, tipo === 'depois' ? 9 : 6);
    if (!lista.length) continue;
    const imgs = [];
    for (const f of lista) {
      try {
        const { data } = await admin.storage.from(BUCKET_OS).download(f.path);
        if (!data) continue;
        const buf = await prepararFoto(Buffer.from(await data.arrayBuffer()));
        imgs.push({ im: buf[0] === 0x89 ? await pdf.embedPng(buf) : await pdf.embedJpg(buf), legenda: f.legenda, quando: f.criado_em });
      } catch (e) {}
    }
    if (!imgs.length) continue;
    { const c0 = tipo === 'depois' ? 3 : 4, g0 = ((LW - 10 * (c0 - 1)) / c0) * 0.75; garante((temFoto ? 0 : 36) + 30 + g0 + 26); }
    if (!temFoto) { secao('Registro fotográfico'); temFoto = true; } page.drawText(`${titulo} · ${(porEtapa[tipo] || []).length} foto${(porEtapa[tipo] || []).length > 1 ? 's' : ''}`, { x: M, y: y - 10, size: 9.5, font: bold, color: cinza }); y -= 18;
    const col = tipo === 'depois' ? 3 : 4, gw = (LW - 10 * (col - 1)) / col, gh = gw * 0.75;
    for (let i = 0; i < imgs.length; i += col) {
      garante(gh + 26);
      imgs.slice(i, i + col).forEach(({ im, legenda, quando }, k) => {
        const x = M + k * (gw + 10);
        page.drawRectangle({ x, y: y - gh, width: gw, height: gh, color: fundo, borderColor: linha, borderWidth: 0.6 });
        const r = Math.min(gw / im.width, gh / im.height); const w = im.width * r, h = im.height * r;
        page.drawImage(im, { x: x + (gw - w) / 2, y: y - gh + (gh - h) / 2, width: w, height: h });
        const leg = (legenda ? legenda.slice(0, 34) + ' · ' : '') + fmtD(quando);
        page.drawText(leg, { x, y: y - gh - 10, size: 7, font: reg, color: cinza });
      });
      y -= gh + 20;
    }
    y -= 4;
  }

  garante(330);
  secao('Declaração');
  texto(`Declaro, para os devidos fins, que o serviço descrito nesta ordem foi executado por mim, ${prest.nome || laudo.assinante_nome}, no imóvel indicado, de acordo com o escopo contratado, com materiais e mão de obra adequados e seguindo as boas práticas técnicas. O local foi entregue limpo, em condições de uso, e os resíduos da obra foram removidos.`, { w: LW });
  texto('Estou ciente de que as informações deste laudo, as fotografias de início, execução e conclusão e a assinatura digital abaixo ficam registradas pela FixIn Reformas e fazem prova da entrega do serviço, e de que respondo pelas informações prestadas e pela garantia do serviço nos termos combinados.', { w: LW });

  y -= 4;
  secao('Assinatura digital');
  const bx = M, bw = LW, bh = 112;
  page.drawRectangle({ x: bx, y: y - bh, width: bw, height: bh, color: rgb(1, 1, 1), borderColor: marinho, borderWidth: 1 });
  try {
    const png = await pdf.embedPng(Buffer.from(String(laudo.assinatura_png).replace(/^data:image\/png;base64,/, ''), 'base64'));
    const h = 62, w = Math.min(230, (png.width / png.height) * h);
    page.drawImage(png, { x: bx + 16, y: y - 12 - h, width: w, height: h });
  } catch (e) {}
  page.drawLine({ start: { x: bx + 16, y: y - 80 }, end: { x: bx + 270, y: y - 80 }, thickness: 0.7, color: preto });
  page.drawText(laudo.assinante_nome, { x: bx + 16, y: y - 93, size: 10, font: bold, color: preto });
  if (laudo.assinante_doc) page.drawText(`Documento: ${laudo.assinante_doc}`, { x: bx + 16, y: y - 105, size: 8, font: reg, color: cinza });
  const sx = bx + 300;
  page.drawText('ASSINADO DIGITALMENTE', { x: sx, y: y - 22, size: 8.5, font: bold, color: verde });
  page.drawText(fmtDH(laudo.criado_em), { x: sx, y: y - 36, size: 9, font: reg, color: preto });
  if (laudo.ip) page.drawText(`IP ${laudo.ip}`, { x: sx, y: y - 49, size: 8, font: reg, color: cinza });
  page.drawText('Código de verificação', { x: sx, y: y - 66, size: 7.5, font: bold, color: cinza });
  String(laudo.hash).match(/.{1,32}/g).forEach((l, i) => page.drawText(l, { x: sx, y: y - 76 - i * 8, size: 6.5, font: reg, color: cinza }));
  y -= bh + 8;

  // rodapé com paginação
  paginas.forEach((p, i) => {
    p.drawLine({ start: { x: M, y: 34 }, end: { x: W - M, y: 34 }, thickness: 0.5, color: linha });
    if (logoT) { const h = 15, w = (logoT.width / logoT.height) * h; p.drawImage(logoT, { x: M, y: 14, width: w, height: h, opacity: 0.9 }); }
    const t = `Documento gerado pelo sistema FixIn Reformas · Página ${i + 1} de ${paginas.length}`;
    p.drawText(t, { x: W - M - reg.widthOfTextAtSize(t, 7.5), y: 18, size: 7.5, font: reg, color: cinza });
  });

  const buffer = Buffer.from(await pdf.save());
  return { buffer, nome: `Laudo-de-finalizacao-${os.numero}.pdf` };
}

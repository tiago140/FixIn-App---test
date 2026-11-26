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

// Impressão digital do laudo: muda se qualquer dado, o texto ou a assinatura mudar.
export function hashLaudo({ osNumero, endereco, nome, doc, obs, assinaturaPng, quando }) {
  return createHash('sha256').update(JSON.stringify([osNumero, endereco, nome, doc, obs || '', createHash('sha256').update(assinaturaPng).digest('hex'), quando])).digest('hex');
}

export async function gerarPdfLaudoFinal(osId) {
  const admin = createAdminClient();
  const { data: os } = await admin.from('ordens_servico').select('*, prestadores(nome, cpf, cnpj, razao_social), os_itens(*)').eq('id', osId).maybeSingle();
  if (!os) return null;
  const { data: laudo } = await admin.from('os_laudos_finalizacao').select('*').eq('os_id', osId).eq('rodada', os.rodada || 0).maybeSingle();
  if (!laudo) return null;
  const [{ data: orc }, { data: cli }, { data: fotos }] = await Promise.all([
    os.orcamento_id ? admin.from('orcamentos').select('numero, garantia').eq('id', os.orcamento_id).maybeSingle() : { data: null },
    os.cliente_id ? admin.from('clientes').select('nome_empresa, nome').eq('id', os.cliente_id).maybeSingle() : { data: null },
    admin.from('os_fotos').select('path, tipo, legenda').eq('os_id', osId).eq('rodada', os.rodada || 0).eq('tipo', 'depois').order('criado_em', { ascending: true }).limit(6),
  ]);
  const itens = (os.os_itens || []).sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
  const prest = os.prestadores || {};

  const pdf = await PDFDocument.create(); pdf.registerFontkit(fontkit);
  const reg = await pdf.embedFont(fs.readFileSync(path.join(process.cwd(), 'public', 'poppins-regular.ttf')), { subset: true });
  const bold = await pdf.embedFont(fs.readFileSync(path.join(process.cwd(), 'public', 'poppins-bold.ttf')), { subset: true });
  const logo = await pdf.embedPng(fs.readFileSync(path.join(process.cwd(), 'public', 'logo-fixin.png'))).catch(() => null);
  const W = 595.28, H = 841.89, M = 48, LW = W - M * 2;
  const marinho = rgb(0.09, 0.18, 0.31), cinza = rgb(0.35, 0.37, 0.42), preto = rgb(0.1, 0.1, 0.1);
  let page = pdf.addPage([W, H]); let y = H - M;
  const nova = () => { page = pdf.addPage([W, H]); y = H - M; };
  const garante = (h) => { if (y - h < M + 30) nova(); };
  const quebra = (t, f, s, w) => { const out = []; for (const par of String(t || '').split('\n')) { let l = ''; for (const p of par.split(/\s+/)) { const x = l ? l + ' ' + p : p; if (f.widthOfTextAtSize(x, s) > w && l) { out.push(l); l = p; } else l = x; } out.push(l); } return out; };
  const texto = (t, { f = reg, s = 10, c = preto, w = LW, x = M, gap = 4 } = {}) => { for (const l of quebra(t, f, s, w)) { garante(s + gap); page.drawText(l, { x, y: y - s, size: s, font: f, color: c }); y -= s + gap; } };
  const campo = (k, v) => { if (!v) return; garante(16); page.drawText(k, { x: M, y: y - 10, size: 9, font: bold, color: cinza }); const ls = quebra(v, reg, 10, LW - 120); ls.forEach((l, i) => { page.drawText(l, { x: M + 120, y: y - 10 - i * 14, size: 10, font: reg, color: preto }); }); y -= Math.max(1, ls.length) * 14 + 2; };
  const secao = (t) => { garante(34); y -= 8; page.drawText(t.toUpperCase(), { x: M, y: y - 10, size: 10, font: bold, color: marinho }); y -= 16; page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.8, color: marinho }); y -= 8; };

  if (logo) { const h = 46, w = (logo.width / logo.height) * h; page.drawImage(logo, { x: M, y: y - h, width: w, height: h }); }
  page.drawText('LAUDO DE FINALIZAÇÃO DE SERVIÇO', { x: M + 150, y: y - 22, size: 15, font: bold, color: marinho });
  page.drawText(`Ordem de serviço ${os.numero}${orc?.numero ? ' · Orçamento ' + orc.numero : ''}`, { x: M + 150, y: y - 40, size: 10, font: reg, color: cinza });
  y -= 62;

  secao('Dados do serviço');
  campo('Imóvel:', os.endereco);
  campo('Cliente:', cli?.nome_empresa || cli?.nome);
  campo('Prestador:', prest.razao_social ? `${prest.nome} (${prest.razao_social})` : prest.nome);
  campo('Documento:', prest.cnpj || prest.cpf || laudo.assinante_doc);
  campo('Ordem aceita em:', fmtDH(os.aceito_em));
  campo('Obra iniciada em:', fmtDH(os.iniciada_em));
  campo('Concluída em:', fmtDH(os.concluido_em || laudo.criado_em));
  if (orc?.garantia) campo('Garantia:', orc.garantia);

  if (itens.length) {
    secao('Serviços executados');
    for (const i of itens) {
      const v = (Number(i.mo) || 0) + (Number(i.ma) || 0);
      const cab = `${i.ambiente ? i.ambiente + ' · ' : ''}${i.servico}`;
      garante(34); const yTopo = y; texto(cab, { f: bold, s: 10, w: LW - 90, gap: 2 });
      if (i.descricao) texto(i.descricao, { s: 9, c: cinza, w: LW - 90, gap: 2 });
      page.drawText(fmtBRL(v), { x: W - M - 80, y: yTopo - 10, size: 10, font: reg, color: preto });
      y -= 4;
    }
    garante(20); page.drawText('Total do serviço', { x: W - M - 200, y: y - 12, size: 10, font: bold, color: marinho }); page.drawText(fmtBRL(totalItensOS(itens)), { x: W - M - 80, y: y - 12, size: 10, font: bold, color: marinho }); y -= 22;
  }

  if (laudo.observacoes || os.conclusao_obs) { secao('Observações do prestador'); texto([os.conclusao_obs, laudo.observacoes].filter(Boolean).join('\n')); }

  secao('Declaração');
  texto(`Declaro, para os devidos fins, que o serviço descrito nesta ordem foi executado por mim, ${prest.nome || laudo.assinante_nome}, no imóvel indicado, de acordo com o escopo contratado, com materiais e mão de obra adequados e seguindo as boas práticas técnicas. O local foi entregue limpo, em condições de uso, e eventuais resíduos da obra foram removidos.`);
  texto('Estou ciente de que as informações deste laudo, as fotografias de início, execução e conclusão e a assinatura digital abaixo são registradas pela FixIn Reformas e fazem prova da entrega do serviço, e de que respondo pelas informações prestadas e pela garantia do serviço nos termos combinados.');

  // fotos finais
  const imgs = [];
  for (const f of fotos || []) {
    try {
      const { data } = await admin.storage.from(BUCKET_OS).download(f.path);
      if (!data) continue;
      const buf = Buffer.from(await data.arrayBuffer());
      const im = buf[0] === 0x89 ? await pdf.embedPng(buf) : await pdf.embedJpg(buf);
      imgs.push(im);
    } catch (e) {}
  }
  if (imgs.length) {
    secao('Fotos da conclusão');
    const cw = (LW - 16) / 3, ch = cw * 0.75;
    for (let i = 0; i < imgs.length; i += 3) {
      garante(ch + 8);
      imgs.slice(i, i + 3).forEach((im, k) => { const r = Math.min(cw / im.width, ch / im.height); page.drawImage(im, { x: M + k * (cw + 8), y: y - im.height * r, width: im.width * r, height: im.height * r }); });
      y -= ch + 8;
    }
  }

  // assinatura
  garante(150); y -= 10;
  secao('Assinatura digital');
  try {
    const png = await pdf.embedPng(Buffer.from(String(laudo.assinatura_png).replace(/^data:image\/png;base64,/, ''), 'base64'));
    const h = 60, w = Math.min(220, (png.width / png.height) * h);
    page.drawImage(png, { x: M, y: y - h, width: w, height: h });
    y -= h + 4;
  } catch (e) { y -= 10; }
  page.drawLine({ start: { x: M, y }, end: { x: M + 240, y }, thickness: 0.8, color: preto }); y -= 4;
  texto(laudo.assinante_nome, { f: bold, s: 10, gap: 2 });
  if (laudo.assinante_doc) texto(`Documento: ${laudo.assinante_doc}`, { s: 9, c: cinza, gap: 2 });
  texto(`Assinado digitalmente em ${fmtDH(laudo.criado_em)}${laudo.ip ? ` · IP ${laudo.ip}` : ''}`, { s: 9, c: cinza, gap: 2 });
  texto(`Código de verificação: ${laudo.hash}`, { s: 7.5, c: cinza, gap: 2 });

  const buffer = Buffer.from(await pdf.save());
  return { buffer, nome: `Laudo-de-finalizacao-${os.numero}.pdf` };
}

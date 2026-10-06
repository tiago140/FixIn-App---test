import { gerarPdfLaudo } from '@/lib/gerarPdfLaudo';
import { nomeArquivoPdf, nomeSeguroStorage } from '@/lib/nomeArquivo';

export const BUCKET = 'laudos'; // espaço PRIVADO de arquivos
export const LIMITE_FOTOS = 24;
export const TAMANHO_MAX_FOTO = 4 * 1024 * 1024;

// Confere o CONTEÚDO do arquivo (não só o que o navegador disse): só JPEG e PNG, que o PDF consegue embutir.
export function tipoDaImagem(bytes) {
  const b = Buffer.from(bytes);
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { mime: 'image/jpeg', ext: 'jpg' };
  if (b.length > 7 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { mime: 'image/png', ext: 'png' };
  return null;
}

export function dataValida(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s || ''))) return false;
  const [a, m, d] = String(s).split('-').map(Number);
  const dt = new Date(Date.UTC(a, m - 1, d));
  return a >= 2000 && dt.getUTCFullYear() === a && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

// A lista de fotos enviada pela tela só pode REORDENAR/legendar as que já existem — nunca criar caminho novo nem apagar foto escondida.
export function aplicarListaFotos(atuais, enviadas) {
  if (!Array.isArray(enviadas)) return { erro: 'lista de fotos inválida' };
  const porId = new Map((atuais || []).map((f) => [f.id, f]));
  const vistos = new Set();
  const nova = [];
  for (const e of enviadas) {
    const f = porId.get(String(e?.id));
    if (!f || vistos.has(f.id)) return { erro: 'A lista de fotos não confere com a do laudo. Recarregue a página.' };
    vistos.add(f.id);
    nova.push({ id: f.id, path: f.path, legenda: String(e.legenda ?? '').replace(/\s+/g, ' ').trim().slice(0, 300) });
  }
  if (nova.length !== porId.size) return { erro: 'A lista de fotos não confere com a do laudo. Recarregue a página.' };
  return { fotos: nova };
}

// Gera o PDF do laudo (mesmo padrão do orçamento) e guarda no espaço privado. Sempre parte do que está SALVO no banco.
export async function montarEGravarPdf(admin, laudoId) {
  const { data: laudo } = await admin.from('laudos').select('*').eq('id', laudoId).maybeSingle();
  if (!laudo) throw new Error('laudo não encontrado');
  const { data: cliente } = await admin.from('clientes').select('nome_empresa').eq('id', laudo.cliente_id).maybeSingle();
  let orcamentoNumero = null;
  if (laudo.orcamento_id) {
    const { data: o } = await admin.from('orcamentos').select('numero').eq('id', laudo.orcamento_id).maybeSingle();
    orcamentoNumero = o?.numero || null;
  }
  const fotos = [];
  for (const f of laudo.fotos || []) {
    const { data, error } = await admin.storage.from(BUCKET).download(f.path);
    if (error || !data) throw new Error('Não consegui ler uma das fotos do laudo. Remova-a e envie de novo.');
    fotos.push({ buffer: Buffer.from(await data.arrayBuffer()), legenda: f.legenda || '' });
  }
  const pdf = await gerarPdfLaudo({ laudo, cliente, orcamentoNumero, fotos });
  // Imobiliária - Endereço completo - LAU-0000.pdf (armazenamento em ASCII; o anexo do e-mail leva os acentos)
  const nomeArquivo = nomeArquivoPdf({ imobiliaria: cliente?.nome_empresa, endereco: laudo.endereco, numero: laudo.numero });
  const path = `${laudo.id}/${nomeSeguroStorage(nomeArquivo)}`;
  const { error: erroUp } = await admin.storage.from(BUCKET).upload(path, pdf, { contentType: 'application/pdf', upsert: true });
  if (erroUp) throw new Error('Não consegui salvar o PDF: ' + erroUp.message);
  await admin.from('laudos').update({ pdf_path: path, pdf_gerado_em: new Date().toISOString() }).eq('id', laudo.id);
  // a versão anterior do PDF (outro nome, p.ex. endereço corrigido) sai do armazenamento
  if (laudo.pdf_path && laudo.pdf_path !== path) { try { await admin.storage.from(BUCKET).remove([laudo.pdf_path]); } catch (e) {} }
  return { pdf, path, laudo, cliente, nomeArquivo };
}

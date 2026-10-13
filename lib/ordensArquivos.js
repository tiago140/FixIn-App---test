import { randomBytes } from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';

export const BUCKET_OS = 'ordens-arquivos';
export const LIMITE_FOTOS_OS = 80;
export const TAMANHO_MAX_FOTO = 6 * 1024 * 1024;
export const TAMANHO_MAX_DOC = 10 * 1024 * 1024;

// Confere o CONTEÚDO do arquivo, não só o que o navegador disse.
export function tipoDoArquivo(bytes, { permitePdf = false } = {}) {
  const b = Buffer.from(bytes);
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { mime: 'image/jpeg', ext: 'jpg' };
  if (b.length > 7 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { mime: 'image/png', ext: 'png' };
  if (permitePdf && b.length > 4 && b.slice(0, 5).toString('latin1') === '%PDF-') return { mime: 'application/pdf', ext: 'pdf' };
  return null;
}

export function novoToken() {
  return randomBytes(24).toString('base64url');
}

// Sobe um arquivo do formulário (campo "arquivo") para a pasta da ordem. Devolve { path } ou { erro, status }.
export async function guardarArquivo(osId, subpasta, form, { permitePdf = false, max = TAMANHO_MAX_FOTO } = {}) {
  const arquivo = form.get('arquivo');
  if (!arquivo || typeof arquivo.arrayBuffer !== 'function') return { erro: 'Nenhum arquivo recebido.', status: 400 };
  if (arquivo.size > max) return { erro: `O arquivo é grande demais (máximo ${Math.round(max / 1048576)} MB).`, status: 413 };
  const bytes = Buffer.from(await arquivo.arrayBuffer());
  const tipo = tipoDoArquivo(bytes, { permitePdf });
  if (!tipo) return { erro: permitePdf ? 'Formato não aceito: use PDF, JPG ou PNG.' : 'Formato não aceito: use fotos JPG ou PNG.', status: 415 };
  const path = `${osId}/${subpasta}/${crypto.randomUUID()}.${tipo.ext}`;
  const { error } = await createAdminClient().storage.from(BUCKET_OS).upload(path, bytes, { contentType: tipo.mime, upsert: false });
  if (error) return { erro: 'Não consegui salvar o arquivo: ' + error.message, status: 500 };
  return { path, nome: String(arquivo.name || '').slice(0, 120) };
}

export async function removerArquivo(path) {
  try { await createAdminClient().storage.from(BUCKET_OS).remove([path]); } catch (e) {}
}

// Garantia: lê o prazo do texto do orçamento ("90 dias", "6 meses", "1 ano") e soma à data de conclusão.
export function vencimentoGarantia(textoGarantia, aPartirDe) {
  const m = String(textoGarantia || '').match(/(\d+)\s*(dias?|mes(?:es)?|mês|anos?)/i);
  if (!m || !aPartirDe) return null;
  const n = Number(m[1]);
  const u = m[2].toLowerCase();
  const d = new Date(aPartirDe);
  if (u.startsWith('dia')) d.setDate(d.getDate() + n);
  else if (u.startsWith('m')) d.setMonth(d.getMonth() + n);
  else d.setFullYear(d.getFullYear() + n);
  return d;
}

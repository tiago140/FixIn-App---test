import { createHash, randomBytes } from 'crypto';

import { STATUS_CHAMADO, COR_STATUS_CHAMADO, PRIORIDADES } from './chamadosTextos';
export { STATUS_CHAMADO, COR_STATUS_CHAMADO, PRIORIDADES };

export const BUCKET_CHAMADOS = 'chamados-anexos';
export const MAX_ARQUIVOS = 6;
export const MAX_BYTES = 8 * 1024 * 1024;
export const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

// Link do acompanhamento: o token é aleatório (256 bits) e só o hash dele fica no banco.
export function novoToken() {
  return randomBytes(32).toString('base64url');
}
export const hashToken = (t) => createHash('sha256').update(String(t || '')).digest('hex');
export const hashIp = (ip) => createHash('sha256').update(`fixin-chamados:${ip || 'x'}`).digest('hex').slice(0, 32);

export function ipDaRequisicao(req) {
  const h = req.headers;
  return (h.get('x-forwarded-for') || '').split(',')[0].trim() || h.get('x-real-ip') || 'desconhecido';
}

export const limpar = (v, max) => String(v ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max);
export const emailValido = (e) => /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/.test(e || '');

export function nomeSeguroArquivo(nome) {
  const base = String(nome || 'arquivo').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9._-]+/g, '-').replace(/-+/g, '-').slice(-60);
  return base || 'arquivo';
}

// Confere os arquivos enviados (quantidade, tamanho e tipo). Devolve texto de erro ou null.
export function validarArquivos(files) {
  if (files.length > MAX_ARQUIVOS) return `Envie no máximo ${MAX_ARQUIVOS} arquivos por vez.`;
  for (const f of files) {
    if (f.size > MAX_BYTES) return `O arquivo "${f.name}" passa de 8 MB.`;
    if (!TIPOS_PERMITIDOS.includes(f.type)) return `O arquivo "${f.name}" não é uma imagem (JPG, PNG, WEBP) nem PDF.`;
  }
  return null;
}

// Guarda os arquivos no bucket PRIVADO e cria uma mensagem para cada um. Só roda no servidor (admin).
export async function salvarAnexos(admin, chamadoId, files, autor) {
  for (const f of files) {
    const caminho = `${chamadoId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${nomeSeguroArquivo(f.name)}`;
    const { error } = await admin.storage.from(BUCKET_CHAMADOS).upload(caminho, Buffer.from(await f.arrayBuffer()), { contentType: f.type, upsert: false });
    if (error) continue;
    await admin.from('chamado_mensagens').insert({ chamado_id: chamadoId, autor_tipo: autor.tipo, autor_nome: autor.nome, texto: '', anexo_path: caminho, anexo_tipo: f.type });
  }
}

// Troca os caminhos por links temporários (1 hora) — o arquivo nunca fica público.
export async function comLinksTemporarios(admin, mensagens) {
  const out = [];
  for (const m of mensagens || []) {
    let url = null;
    if (m.anexo_path) {
      const { data } = await admin.storage.from(BUCKET_CHAMADOS).createSignedUrl(m.anexo_path, 3600);
      url = data?.signedUrl || null;
    }
    out.push({ id: m.id, autor_tipo: m.autor_tipo, autor_nome: m.autor_nome, texto: m.texto, anexo_tipo: m.anexo_tipo, criado_em: m.criado_em, anexo_url: url });
  }
  return out;
}

// Limite simples de uso: máximo de chamados abertos por origem e por imobiliária na última hora.
export async function passouLimite(admin, { ipHash, clienteId }) {
  const desde = new Date(Date.now() - 3600 * 1000).toISOString();
  const { count: porIp } = await admin.from('chamados').select('id', { count: 'exact', head: true }).eq('ip_hash', ipHash).gte('criado_em', desde);
  if ((porIp || 0) >= 5) return true;
  const { count: porCliente } = await admin.from('chamados').select('id', { count: 'exact', head: true }).eq('cliente_id', clienteId).gte('criado_em', desde);
  return (porCliente || 0) >= 40;
}

// Confere (pelas regras de segurança do banco) se quem está logado enxerga este chamado.
// Master vê todos; a imobiliária só os dela. Devolve { user, profile, supabase, chamado } ou { erro, status }.
export async function acessoChamado(getProfile, id) {
  const { user, profile, supabase } = await getProfile();
  if (!user || !['master', 'imobiliaria'].includes(profile?.role)) return { erro: 'sem permissão', status: 403 };
  const { data: chamado } = await supabase.from('chamados').select('*').eq('id', id).maybeSingle();
  if (!chamado) return { erro: 'Chamado não encontrado.', status: 404 };
  return { user, profile, supabase, chamado };
}

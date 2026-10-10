import { randomBytes, scryptSync, createCipheriv } from 'crypto';
import { zipSync, strToU8 } from 'fflate';
import { LEIA_ME, RESTAURAR_MJS } from './backupTextos';

const TABELAS = ['auditoria', 'catalogo_itens', 'chamado_mensagens', 'chamados', 'clientes', 'laudos', 'leads_site', 'mensagens', 'orcamento_comprovantes', 'orcamento_documentos_fiscais', 'orcamento_itens', 'orcamentos', 'prestadores', 'profiles', 'visitas', 'zz_import_orcamentos'];
// Os PDFs de orçamento ficam de fora: o sistema gera de novo a qualquer momento.
const BUCKETS = ['chat-anexos', 'comprovantes-pagamento', 'documentos-fiscais', 'chamados-anexos', 'laudos', 'vistorias'];

async function lerTabela(admin, t) {
  const todas = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await admin.from(t).select('*').range(de, de + 999);
    if (error) throw new Error(`${t}: ${error.message}`);
    todas.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return todas;
}

async function listarArquivos(admin, bucket, prefixo = '') {
  const { data } = await admin.storage.from(bucket).list(prefixo, { limit: 1000 });
  const out = [];
  for (const it of data || []) {
    const caminho = prefixo ? `${prefixo}/${it.name}` : it.name;
    if (it.id) out.push(caminho);
    else out.push(...(await listarArquivos(admin, bucket, caminho)));
  }
  return out;
}

// Monta o pacote completo (zip) e devolve { zip: Uint8Array, info }.
export async function gerarBackup(admin) {
  const arquivos = {};
  const info = { gerado_em: new Date().toISOString(), tabelas: {}, arquivos: 0, avisos: [] };

  const { data: esquema, error: erroEsq } = await admin.rpc('backup_esquema');
  if (erroEsq) info.avisos.push('esquema: ' + erroEsq.message);
  arquivos['esquema.sql'] = strToU8(esquema || '-- não foi possível gerar o esquema');

  for (const t of TABELAS) {
    try {
      const linhas = await lerTabela(admin, t);
      info.tabelas[t] = linhas.length;
      arquivos[`dados/${t}.json`] = strToU8(JSON.stringify(linhas));
    } catch (e) { info.avisos.push(String(e.message || e)); }
  }

  const { data: lista } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const usuarios = (lista?.users || []).map((u) => ({ id: u.id, email: u.email, criado_em: u.created_at, app_metadata: u.app_metadata, user_metadata: u.user_metadata }));
  arquivos['usuarios.json'] = strToU8(JSON.stringify(usuarios));
  info.usuarios = usuarios.length;

  for (const b of BUCKETS) {
    try {
      for (const caminho of await listarArquivos(admin, b)) {
        const { data: blob } = await admin.storage.from(b).download(caminho);
        if (!blob) { info.avisos.push(`arquivo ${b}/${caminho} não baixou`); continue; }
        arquivos[`arquivos/${b}/${caminho}`] = new Uint8Array(await blob.arrayBuffer());
        info.arquivos += 1;
      }
    } catch (e) { info.avisos.push(`bucket ${b}: ${e.message}`); }
  }

  arquivos['LEIA-ME.md'] = strToU8(LEIA_ME);
  arquivos['restaurar.mjs'] = strToU8(RESTAURAR_MJS);
  arquivos['info.json'] = strToU8(JSON.stringify(info, null, 2));
  return { zip: zipSync(arquivos, { level: 6 }), info };
}

export const nomeBackup = (d = new Date()) => {
  const sp = new Date(d.getTime() - 3 * 3600 * 1000).toISOString().slice(0, 16).replace('T', '_').replace(':', 'h');
  return `fixin-backup-${sp}.zip`;
};

// Envia para o Google Drive pelo "Apps Script" do próprio dono (a cópia fica no Drive dele).
export async function enviarParaDrive(nome, zip) {
  const url = process.env.BACKUP_DRIVE_URL;
  const segredo = process.env.BACKUP_DRIVE_SEGREDO;
  if (!url || !segredo) return { ok: false, motivo: 'Envio ao Google Drive ainda não configurado (BACKUP_DRIVE_URL e BACKUP_DRIVE_SEGREDO).' };
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ segredo, nome, base64: Buffer.from(zip).toString('base64') }), redirect: 'follow' });
    const j = await r.json().catch(() => ({}));
    return j.ok ? { ok: true } : { ok: false, motivo: `O Drive recusou: ${j.erro || r.status}` };
  } catch (e) { return { ok: false, motivo: 'Falha ao falar com o Drive: ' + (e.message || e) }; }
}

// Criptografia opcional (AES-256-GCM, chave derivada da senha com scrypt). Formato: "FIXBK1" + sal(16) + iv(12) + tag(16) + dados.
export function criptografarBackup(zip, senha) {
  const sal = randomBytes(16), iv = randomBytes(12);
  const chave = scryptSync(senha, sal, 32);
  const c = createCipheriv('aes-256-gcm', chave, iv);
  const dados = Buffer.concat([c.update(Buffer.from(zip)), c.final()]);
  return Buffer.concat([Buffer.from('FIXBK1'), sal, iv, c.getAuthTag(), dados]);
}

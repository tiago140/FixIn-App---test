// Textos que vão dentro do pacote de backup (guia e script de restauração). Sem crases dentro dos textos.
export const LEIA_ME = `# Backup FixIn Reformas

Este pacote tem TUDO o que é preciso para colocar o sistema FixIn de pé de novo, por você ou por qualquer outro programador.

## O que tem aqui dentro
- esquema.sql ........ estrutura do banco (tabelas, regras de acesso, funções, visões, pastas de arquivos)
- dados/*.json ....... o conteúdo de cada tabela (orçamentos, itens, imobiliárias, chamados, mensagens, auditoria...)
- usuarios.json ...... lista de usuários (e-mail, perfil). As SENHAS NÃO vão no backup: ao restaurar, cada pessoa recebe uma senha provisória e troca no primeiro acesso.
- arquivos/ .......... comprovantes, notas fiscais, anexos do chat e dos chamados, laudos e vistorias. Os PDFs de orçamento NÃO entram (o sistema gera de novo).
- restaurar.mjs ...... script que devolve tudo para um projeto Supabase novo
- info.json .......... data, quantidade de linhas por tabela e de arquivos

## Como restaurar (para um programador)
1. Crie um projeto novo em supabase.com (região de sua preferência).
2. No SQL Editor do projeto novo, cole e rode o conteúdo de esquema.sql.
3. Em Project Settings > API, copie a URL do projeto e a chave service_role.
4. Na pasta onde descompactou este backup, rode (precisa de Node 18 ou mais novo):
     npm install @supabase/supabase-js
     NOVO_URL=https://SEU-PROJETO.supabase.co NOVA_CHAVE=sua_service_role node restaurar.mjs
5. O script recria os usuários (com senha provisória, impressa no fim), carrega as tabelas na ordem certa e envia os arquivos.
6. Faça o deploy do sistema (código no GitHub: repositório FixIn-App---test) na Vercel com as variáveis de ambiente apontando para o projeto novo (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY e as demais do README do projeto).

## Como pedir para o Claude restaurar
Envie este arquivo .zip na conversa e peça: "restaure este backup do FixIn". Informe o projeto Supabase de destino.

## Cuidados
- Este pacote contém dados pessoais de clientes (LGPD). Guarde em local privado e não compartilhe.
- Teste a restauração em um projeto de teste pelo menos uma vez por trimestre.
`;

export const RESTAURAR_MJS = `// Restaura o backup FixIn em um projeto Supabase NOVO (que já recebeu o esquema.sql).
// Uso: NOVO_URL=... NOVA_CHAVE=... node restaurar.mjs
import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';

const aqui = dirname(fileURLToPath(import.meta.url));
const { NOVO_URL, NOVA_CHAVE } = process.env;
if (!NOVO_URL || !NOVA_CHAVE) { console.error('Informe NOVO_URL e NOVA_CHAVE (service_role).'); process.exit(1); }
const sb = createClient(NOVO_URL, NOVA_CHAVE, { auth: { autoRefreshToken: false, persistSession: false } });

const ORDEM = ['clientes', 'prestadores', 'catalogo_itens', 'profiles', 'orcamentos', 'orcamento_itens', 'mensagens', 'orcamento_comprovantes', 'orcamento_documentos_fiscais', 'visitas', 'laudos', 'chamados', 'chamado_mensagens', 'auditoria', 'leads_site', 'zz_import_orcamentos'];

// 1) usuários
const usuarios = JSON.parse(readFileSync(join(aqui, 'usuarios.json'), 'utf8'));
const senhas = [];
for (const u of usuarios) {
  const senha = randomBytes(9).toString('base64url');
  const { error } = await sb.auth.admin.createUser({ id: u.id, email: u.email, password: senha, email_confirm: true, app_metadata: { trocar_senha: true } });
  if (error) console.warn('Usuário', u.email, '->', error.message); else senhas.push(u.email + '  ' + senha);
}

// 2) tabelas
for (const t of ORDEM) {
  const f = join(aqui, 'dados', t + '.json');
  if (!existsSync(f)) continue;
  const linhas = JSON.parse(readFileSync(f, 'utf8'));
  for (let i = 0; i < linhas.length; i += 500) {
    const { error } = await sb.from(t).upsert(linhas.slice(i, i + 500));
    if (error) { console.error('ERRO em', t, error.message); break; }
  }
  console.log(t + ': ' + linhas.length + ' linhas');
}

// 3) arquivos
function percorrer(dir) {
  return readdirSync(dir).flatMap((n) => { const p = join(dir, n); return statSync(p).isDirectory() ? percorrer(p) : [p]; });
}
const raiz = join(aqui, 'arquivos');
if (existsSync(raiz)) {
  for (const p of percorrer(raiz)) {
    const rel = relative(raiz, p).split('\\\\').join('/');
    const bucket = rel.split('/')[0];
    const caminho = rel.split('/').slice(1).join('/');
    const { error } = await sb.storage.from(bucket).upload(caminho, readFileSync(p), { upsert: true });
    if (error) console.warn('Arquivo', rel, error.message);
  }
}
console.log('\\nSenhas provisórias (cada pessoa troca no primeiro acesso):\\n' + senhas.join('\\n'));
`;

export const APPS_SCRIPT = `// Cole em script.google.com (projeto novo) > Implantar > Nova implantação > App da Web
// Executar como: você | Quem tem acesso: Qualquer pessoa. Depois copie a URL e coloque o mesmo SEGREDO no Vercel.
const SEGREDO = 'TROQUE-POR-UMA-FRASE-LONGA-E-SECRETA';
const PASTA = 'FixIn - Backups';
const GUARDAR = 30; // quantos backups manter

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    if (d.segredo !== SEGREDO) return saida({ ok: false, erro: 'segredo' });
    const it = DriveApp.getFoldersByName(PASTA);
    const pasta = it.hasNext() ? it.next() : DriveApp.createFolder(PASTA);
    const blob = Utilities.newBlob(Utilities.base64Decode(d.base64), 'application/zip', d.nome);
    pasta.createFile(blob);
    const arquivos = [];
    const lista = pasta.getFiles();
    while (lista.hasNext()) arquivos.push(lista.next());
    arquivos.sort((a, b) => b.getDateCreated() - a.getDateCreated());
    arquivos.slice(GUARDAR).forEach((f) => f.setTrashed(true));
    return saida({ ok: true });
  } catch (err) {
    return saida({ ok: false, erro: String(err) });
  }
}
function saida(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
`;

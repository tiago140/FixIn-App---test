// Uso: BACKUP_SENHA='sua-senha' node scripts/descriptografar-backup.mjs fixin-backup-XXXX.zip.enc [saida.zip]
import { readFileSync, writeFileSync } from 'fs';
import { scryptSync, createDecipheriv } from 'crypto';
const [entrada, saida] = process.argv.slice(2);
const senha = process.env.BACKUP_SENHA;
if (!entrada || !senha) { console.error('Informe o arquivo .enc e a variável BACKUP_SENHA.'); process.exit(1); }
const b = readFileSync(entrada);
if (b.slice(0, 6).toString() !== 'FIXBK1') { console.error('Arquivo não reconhecido.'); process.exit(1); }
const sal = b.slice(6, 22), iv = b.slice(22, 34), tag = b.slice(34, 50), dados = b.slice(50);
const d = createDecipheriv('aes-256-gcm', scryptSync(senha, sal, 32), iv);
d.setAuthTag(tag);
try { writeFileSync(saida || entrada.replace(/\.enc$/, ''), Buffer.concat([d.update(dados), d.final()])); console.log('Pronto.'); }
catch { console.error('Senha incorreta ou arquivo corrompido.'); process.exit(1); }

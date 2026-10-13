import { asaas } from '@/lib/asaas';
import { recalcularPagamentoOS } from '@/lib/ordensExec';
import { avisarPrestadorOS } from '@/lib/ordens';
import { fmtBRL } from '@/lib/format';

// Pix ao prestador pelo Asaas: basta a chave Pix cadastrada (o prestador NÃO precisa ter conta no Asaas).
// Só funciona com ASAAS_PIX_PRESTADOR=ativo (liga manual, depois de testar no sandbox).
export const TIPO_ASAAS = { cpf: 'CPF', cnpj: 'CNPJ', email: 'EMAIL', telefone: 'PHONE', aleatoria: 'EVP' };

export function pixPrestadorAtivo() { return process.env.ASAAS_PIX_PRESTADOR === 'ativo'; }
export function limitePix() { const n = Number(process.env.ASAAS_PIX_LIMITE); return n > 0 ? n : 5000; }

export function normalizarChave(tipo, chave) {
  const c = String(chave || '').trim();
  if (tipo === 'cpf' || tipo === 'cnpj') return c.replace(/\D/g, '');
  if (tipo === 'telefone') { let d = c.replace(/\D/g, ''); if (d.startsWith('55') && d.length > 11) d = d.slice(2); return d; }
  if (tipo === 'email') return c.toLowerCase();
  return c;
}

export function chaveMascarada(tipo, chave) {
  const c = normalizarChave(tipo, chave);
  if (!c) return '';
  if (tipo === 'email') { const [u, d] = c.split('@'); return `${u.slice(0, 2)}***@${d || ''}`; }
  return c.length > 6 ? `${c.slice(0, 3)}***${c.slice(-3)}` : '***';
}

// Aplica o estado atual de uma transferência do Asaas na linha de pagamento.
export async function aplicarTransferencia(admin, pag, tr) {
  const agora = new Date().toISOString();
  const st = String(tr?.status || '').toUpperCase();
  let novo = null; const upd = {};
  if (st === 'DONE') { novo = 'confirmado'; upd.comprovante_url = tr.transactionReceiptUrl || pag.comprovante_url || null; upd.data_pagamento = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }); }
  else if (['FAILED', 'CANCELLED', 'BLOCKED'].includes(st)) { novo = st === 'FAILED' ? 'falhou' : 'cancelado'; upd.erro = tr.failReason || (st === 'BLOCKED' ? 'Transferência bloqueada pelo Asaas' : 'Cancelada'); }
  if (!novo || pag.status === novo) return pag.status;
  if (pag.status === 'confirmado') return pag.status;
  await admin.from('pagamentos_prestador').update({ status: novo, ...upd }).eq('id', pag.id);
  const { data: os } = await admin.from('ordens_servico').select('*').eq('id', pag.os_id).maybeSingle();
  const res = await recalcularPagamentoOS(admin, pag.os_id);
  try { await admin.from('auditoria').insert({ acao: novo === 'confirmado' ? 'Pix ao prestador confirmado (Asaas)' : 'Pix ao prestador não concluído (Asaas)', detalhe: `${os?.numero || ''} · ${fmtBRL(pag.valor)}${upd.erro ? ' · ' + upd.erro : ''}`, alvo_tipo: 'ordem_servico', alvo_id: pag.os_id, autor_nome: 'Asaas', autor_role: 'sistema' }); } catch (e) {}
  if (novo === 'confirmado' && os) await avisarPrestadorOS({ ...os, status: res?.status || os.status }, 'paga', fmtBRL(pag.valor));
  return novo;
}

// Consulta o Asaas e atualiza as transferências ainda em processamento de uma ordem.
export async function atualizarPixDaOrdem(admin, osId) {
  const { data: abertos } = await admin.from('pagamentos_prestador').select('*').eq('os_id', osId).eq('status', 'processando').not('asaas_transfer_id', 'is', null);
  for (const p of abertos || []) {
    try { const tr = await asaas(`/transfers/${p.asaas_transfer_id}`); await aplicarTransferencia(admin, p, tr); } catch (e) {}
  }
}

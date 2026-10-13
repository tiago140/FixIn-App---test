import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { createAdminClient } from '@/lib/supabase/admin';
import { asaas, asaasConfigurado } from '@/lib/asaas';
import { totalItensOS } from '@/lib/ordens';
import { pixPrestadorAtivo, limitePix, normalizarChave, TIPO_ASAAS, aplicarTransferencia, atualizarPixDaOrdem } from '@/lib/pixPrestador';
import { fmtBRL } from '@/lib/format';

export const runtime = 'nodejs';
export const maxDuration = 30;
const erro = (m, s = 400) => NextResponse.json({ error: m }, { status: s });

// Pix ao prestador pelo Asaas (só gestão). { acao: 'pagar', valor } ou { acao: 'atualizar' }.
export async function POST(req, { params }) {
  const { user, profile } = await getProfile();
  if (!user || profile?.role !== 'master' || !profile.dono) return erro('Só o perfil de gestão paga prestadores.', 403);
  const admin = createAdminClient();
  const b = await req.json().catch(() => ({}));

  if (b.acao === 'atualizar') { await atualizarPixDaOrdem(admin, params.id); return NextResponse.json({ ok: true }); }

  if (!pixPrestadorAtivo()) return erro('O pagamento por Pix pelo Asaas ainda não foi ligado. Registre o pagamento com comprovante.', 409);
  if (!asaasConfigurado()) return erro('Asaas não configurado.', 409);

  const { data: os } = await admin.from('ordens_servico').select('*, os_itens(mo, ma), prestadores(id, nome, pix_tipo, pix_chave)').eq('id', params.id).maybeSingle();
  if (!os) return erro('ordem não encontrada', 404);
  if (os.status !== 'aprovada') return erro('O Pix só é liberado depois que a conclusão é aprovada.', 409);
  const pr = os.prestadores;
  if (!pr?.pix_chave || !pr?.pix_tipo) return erro('O prestador não tem chave Pix cadastrada.', 409);

  const valor = Math.round(Number(b.valor) * 100) / 100;
  if (!(valor > 0)) return erro('Informe um valor válido.');
  if (valor > limitePix()) return erro(`Acima do limite de ${fmtBRL(limitePix())} por Pix automático. Faça direto no banco e registre o comprovante.`);

  const { data: pags } = await admin.from('pagamentos_prestador').select('valor, status').eq('os_id', os.id);
  const jaVai = (pags || []).filter((p) => ['confirmado', 'processando'].includes(p.status || 'confirmado')).reduce((s, p) => s + Number(p.valor), 0);
  const saldo = Math.round((totalItensOS(os.os_itens) - jaVai) * 100) / 100;
  if (valor > saldo + 0.005) return erro(`O valor passa do saldo da ordem (${fmtBRL(Math.max(0, saldo))}).`);

  const chave = normalizarChave(pr.pix_tipo, pr.pix_chave);
  const hoje = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  // registra antes de chamar o Asaas: se algo cair no meio, fica rastreado como "processando"
  const { data: pag, error: e1 } = await admin.from('pagamentos_prestador').insert({
    os_id: os.id, prestador_id: os.prestador_id, valor, data_pagamento: hoje, forma: 'Pix (Asaas)', status: 'processando', criado_por: user.id,
  }).select().single();
  if (e1) return erro(e1.message);

  let tr;
  try {
    tr = await asaas('/transfers', { method: 'POST', body: { value: valor, pixAddressKey: chave, pixAddressKeyType: TIPO_ASAAS[pr.pix_tipo], description: `FixIn ${os.numero}`.slice(0, 140) } });
  } catch (e) {
    await admin.from('pagamentos_prestador').update({ status: 'falhou', erro: String(e.message).slice(0, 300) }).eq('id', pag.id);
    return erro(`O Asaas recusou o Pix: ${e.message}`, 502);
  }
  await admin.from('pagamentos_prestador').update({ asaas_transfer_id: tr.id }).eq('id', pag.id);
  try { await admin.from('auditoria').insert({ acao: 'Enviou Pix ao prestador (Asaas)', detalhe: `${os.numero} · ${pr.nome} · ${fmtBRL(valor)}`, alvo_tipo: 'ordem_servico', alvo_id: os.id, autor_id: user.id, autor_nome: profile.nome_completo, autor_role: profile.role }); } catch (e) {}
  const estado = await aplicarTransferencia(admin, { ...pag, asaas_transfer_id: tr.id }, tr);
  return NextResponse.json({ ok: true, estado });
}

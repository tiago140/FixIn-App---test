import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { asaas } from '@/lib/asaas';

export const dynamic = 'force-dynamic';

function tokenOk(recebido) {
  const esperado = process.env.ASAAS_WEBHOOK_TOKEN || '';
  if (!esperado || !recebido) return false;
  const a = Buffer.from(String(recebido)); const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Aviso do Asaas: pagamento confirmado/recebido. Não confia só no aviso: confere o status direto no Asaas.
export async function POST(req) {
  if (!tokenOk(req.headers.get('asaas-access-token'))) return NextResponse.json({ error: 'não autorizado' }, { status: 401 });
  const ev = await req.json().catch(() => ({}));
  const pid = ev?.payment?.id;
  const evento = ev?.event;
  if (!pid || !evento) return NextResponse.json({ ok: true });

  const admin = createAdminClient();
  const { data: cob } = await admin.from('cobrancas').select('*').eq('externo_id', pid).maybeSingle();
  if (!cob) return NextResponse.json({ ok: true }); // não é nossa

  let real;
  try { real = await asaas(`/payments/${pid}`); } catch (e) { return NextResponse.json({ error: 'tente de novo' }, { status: 500 }); }
  const agora = new Date().toISOString();

  if (['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED'].includes(evento) && ['CONFIRMED', 'RECEIVED', 'RECEIVED_IN_CASH'].includes(real.status)) {
    if (Math.abs(Number(real.value) - Number(cob.valor)) > 0.009) {
      await admin.from('cobrancas').update({ status: 'pendente', atualizado_em: agora }).eq('id', cob.id);
      return NextResponse.json({ ok: true, divergente: true });
    }
    const noCaixa = real.status === 'RECEIVED' || real.status === 'RECEIVED_IN_CASH';
    const novo = noCaixa ? 'no_caixa' : 'aprovado';
    // dinheiro conta uma única vez: só na primeira vez que a cobrança vira aprovada/no caixa
    const primeira = cob.status === 'pendente' || cob.status === 'vencida';
    await admin.from('cobrancas').update({ status: novo, pago_em: cob.pago_em || agora, atualizado_em: agora }).eq('id', cob.id);
    if (primeira) {
      const { data: l } = await admin.from('lancamentos').select('*').eq('id', cob.lancamento_id).single();
      const pago = Math.min(Number(l.valor), Math.round((Number(l.valor_pago || 0) + Number(cob.valor)) * 100) / 100);
      const hoje = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
      await admin.from('lancamentos').update({ valor_pago: pago, status: pago >= Number(l.valor) ? 'pago' : l.status, data_pagamento: hoje, atualizado_em: agora }).eq('id', l.id);
      if (l.orcamento_id) {
        await admin.from('orcamentos').update({ valor_pago: pago, pagamento_cliente_status: pago >= Number(l.valor) ? 'pago_total' : 'entrada_paga', pagamento_verificado_em: agora, atualizado_em: agora }).eq('id', l.orcamento_id);
      }
      try { await admin.from('auditoria').insert({ acao: 'Pagamento recebido (Asaas)', detalhe: `${l.descricao} · R$ ${Number(cob.valor).toFixed(2)}`, alvo_tipo: 'lancamento', alvo_id: l.id, autor_nome: 'Asaas', autor_role: 'sistema' }); } catch (e) {}
    }
  } else if (evento === 'PAYMENT_OVERDUE') {
    if (cob.status === 'pendente') await admin.from('cobrancas').update({ status: 'vencida', atualizado_em: agora }).eq('id', cob.id);
  } else if (['PAYMENT_DELETED', 'PAYMENT_REFUNDED'].includes(evento)) {
    if (cob.status === 'pendente') await admin.from('cobrancas').update({ status: evento === 'PAYMENT_DELETED' ? 'cancelada' : 'estornada', atualizado_em: agora }).eq('id', cob.id);
  }
  return NextResponse.json({ ok: true });
}

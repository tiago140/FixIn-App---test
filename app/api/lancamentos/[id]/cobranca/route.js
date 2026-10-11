import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { createAdminClient } from '@/lib/supabase/admin';
import { asaas, asaasConfigurado, garantirClienteAsaas } from '@/lib/asaas';
import { hojeSP, somarDias } from '@/lib/lancamentos';

export const dynamic = 'force-dynamic';

// Gera a cobrança (Pix, boleto ou cartão no mesmo link) de uma parcela de um valor a receber. Só o dono.
// O valor é SEMPRE calculado aqui no servidor, nunca vem da tela.
export async function POST(req, { params }) {
  const { user, profile, supabase } = await getProfile();
  if (!user || profile?.role !== 'master' || !profile.dono) return NextResponse.json({ error: 'sem permissão' }, { status: 403 });
  if (!asaasConfigurado()) return NextResponse.json({ error: 'Asaas ainda não configurado.' }, { status: 400 });
  const b = await req.json().catch(() => ({}));
  const parcela = b.parcela;
  if (!['entrada', 'saldo', 'total'].includes(parcela)) return NextResponse.json({ error: 'Parcela inválida.' }, { status: 400 });

  const { data: l } = await supabase.from('lancamentos').select('*').eq('id', params.id).maybeSingle();
  if (!l || l.tipo !== 'receber') return NextResponse.json({ error: 'Valor a receber não encontrado.' }, { status: 404 });
  if (!['previsto', 'aprovado'].includes(l.status)) return NextResponse.json({ error: 'Este valor não está em aberto.' }, { status: 400 });
  if (!l.cliente_id) return NextResponse.json({ error: 'Este lançamento não tem imobiliária.' }, { status: 400 });

  const admin = createAdminClient();
  // já existe cobrança aberta? devolve a mesma (evita cobrar duas vezes)
  const { data: abertas } = await admin.from('cobrancas').select('*').eq('lancamento_id', l.id).in('status', ['pendente', 'aprovado']);
  if (abertas && abertas.length) {
    const a = abertas[0];
    if (a.parcela === parcela) return NextResponse.json({ ok: true, url: a.url, repetida: true });
    return NextResponse.json({ error: 'Já existe uma cobrança em aberto para este valor. Cancele-a antes de gerar outra.' }, { status: 400 });
  }

  const restante = Math.round((Number(l.valor) - Number(l.valor_pago || 0)) * 100) / 100;
  if (restante <= 0) return NextResponse.json({ error: 'Nada a receber neste lançamento.' }, { status: 400 });
  let valor;
  if (parcela === 'entrada') valor = Math.min(restante, Math.round((Number(l.valor) / 2) * 100) / 100);
  else valor = restante; // saldo e total: o que falta
  if (parcela === 'entrada' && Number(l.valor_pago || 0) > 0) return NextResponse.json({ error: 'A entrada já foi recebida. Gere o saldo.' }, { status: 400 });
  if (!(valor > 0)) return NextResponse.json({ error: 'Valor inválido.' }, { status: 400 });

  const { data: cliente } = await admin.from('clientes').select('id, nome, nome_empresa, email, cnpj, asaas_customer_id').eq('id', l.cliente_id).single();
  // Quem paga: a imobiliária (padrão) ou uma pessoa/empresa informada na hora (CPF ou CNPJ).
  let pagador = null;
  if (b.pagador && (b.pagador.documento || b.pagador.nome)) {
    const doc = String(b.pagador.documento || '').replace(/\D/g, '');
    const nome = String(b.pagador.nome || '').trim().slice(0, 120);
    if (!nome) return NextResponse.json({ error: 'Informe o nome de quem vai pagar.' }, { status: 400 });
    if (doc.length !== 11 && doc.length !== 14) return NextResponse.json({ error: 'CPF ou CNPJ de quem vai pagar inválido (11 ou 14 números).' }, { status: 400 });
    pagador = { nome, doc, email: String(b.pagador.email || '').trim().slice(0, 120) || undefined };
  }
  const vencimento = somarDias(hojeSP(), 3);
  let cob;
  try {
    let customer;
    if (pagador) {
      const c = await asaas('/customers', { method: 'POST', body: { name: pagador.nome, cpfCnpj: pagador.doc, email: pagador.email, notificationDisabled: true, externalReference: `${cliente.id}:avulso` } });
      customer = c.id;
    } else {
      customer = await garantirClienteAsaas(admin, cliente);
    }
    cob = await asaas('/payments', { method: 'POST', body: { customer, billingType: 'UNDEFINED', value: valor, dueDate: vencimento, description: `${pagador ? `[Pagador: ${pagador.nome}] ` : ''}${l.descricao} (${parcela === 'entrada' ? 'entrada 50%' : parcela === 'saldo' ? 'saldo' : 'pagamento integral'})`.slice(0, 500), externalReference: l.id } });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Não foi possível gerar a cobrança.' }, { status: 400 });
  }

  const { error } = await admin.from('cobrancas').insert({ lancamento_id: l.id, parcela, valor, externo_id: cob.id, url: cob.invoiceUrl, tipo_cobranca: 'UNDEFINED', vencimento, criado_por: user.id });
  if (error) return NextResponse.json({ error: 'A cobrança foi criada no Asaas, mas não foi salva aqui. Avise o suporte.' }, { status: 500 });
  try { await supabase.from('auditoria').insert({ acao: 'Cobrança gerada', detalhe: `${l.descricao} · ${parcela} · R$ ${valor.toFixed(2)}`, alvo_tipo: 'lancamento', alvo_id: l.id, autor_id: user.id, autor_nome: profile.nome_completo, autor_role: profile.role }); } catch (e) {}
  return NextResponse.json({ ok: true, url: cob.invoiceUrl });
}

// Cancela a cobrança aberta (ex.: gerou a parcela errada).
export async function DELETE(req, { params }) {
  const { user, profile } = await getProfile();
  if (!user || profile?.role !== 'master' || !profile.dono) return NextResponse.json({ error: 'sem permissão' }, { status: 403 });
  const admin = createAdminClient();
  const { data: abertas } = await admin.from('cobrancas').select('*').eq('lancamento_id', params.id).in('status', ['pendente']);
  for (const c of abertas || []) {
    try { await asaas(`/payments/${c.externo_id}`, { method: 'DELETE' }); } catch (e) { return NextResponse.json({ error: e.message }, { status: 400 }); }
    await admin.from('cobrancas').update({ status: 'cancelada', atualizado_em: new Date().toISOString() }).eq('id', c.id);
  }
  return NextResponse.json({ ok: true });
}

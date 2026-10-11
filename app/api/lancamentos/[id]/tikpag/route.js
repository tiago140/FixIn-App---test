import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { createAdminClient } from '@/lib/supabase/admin';
import { tikpagConfigurado, criarCheckout } from '@/lib/tikpag';

export const dynamic = 'force-dynamic';

// "Pague com o TikPag": cria o checkout (cartão etc.) de uma parcela. Só o dono. Valor calculado aqui.
export async function POST(req, { params }) {
  const { user, profile, supabase } = await getProfile();
  if (!user || profile?.role !== 'master' || !profile.dono) return NextResponse.json({ error: 'sem permissão' }, { status: 403 });
  if (!tikpagConfigurado()) return NextResponse.json({ error: 'TikPag ainda não configurado: aguardando a documentação do checkout.' }, { status: 501 });
  const b = await req.json().catch(() => ({}));
  const parcela = b.parcela;
  if (!['entrada', 'saldo', 'total'].includes(parcela)) return NextResponse.json({ error: 'Parcela inválida.' }, { status: 400 });

  const { data: l } = await supabase.from('lancamentos').select('*').eq('id', params.id).maybeSingle();
  if (!l || l.tipo !== 'receber') return NextResponse.json({ error: 'Valor a receber não encontrado.' }, { status: 404 });
  if (!['previsto', 'aprovado'].includes(l.status)) return NextResponse.json({ error: 'Este valor não está em aberto.' }, { status: 400 });

  const admin = createAdminClient();
  const { data: abertas } = await admin.from('cobrancas').select('*').eq('lancamento_id', l.id).in('status', ['pendente', 'aprovado']);
  if (abertas && abertas.length) {
    if (abertas[0].parcela === parcela && abertas[0].provedor === 'tikpag') return NextResponse.json({ ok: true, url: abertas[0].url, repetida: true });
    return NextResponse.json({ error: 'Já existe uma cobrança em aberto para este valor. Cancele-a antes de gerar outra.' }, { status: 400 });
  }
  const restante = Math.round((Number(l.valor) - Number(l.valor_pago || 0)) * 100) / 100;
  if (restante <= 0) return NextResponse.json({ error: 'Nada a receber neste lançamento.' }, { status: 400 });
  if (parcela === 'entrada' && Number(l.valor_pago || 0) > 0) return NextResponse.json({ error: 'A entrada já foi recebida. Gere o saldo.' }, { status: 400 });
  const valor = parcela === 'entrada' ? Math.min(restante, Math.round((Number(l.valor) / 2) * 100) / 100) : restante;

  let ck;
  try {
    ck = await criarCheckout({ valor, descricao: l.descricao, referencia: l.id, pagador: b.pagador || null });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Não foi possível criar o checkout.' }, { status: 400 });
  }
  const { error } = await admin.from('cobrancas').insert({ lancamento_id: l.id, provedor: 'tikpag', parcela, valor, externo_id: ck.externo_id, url: ck.url, tipo_cobranca: 'CARTAO', criado_por: user.id });
  if (error) return NextResponse.json({ error: 'O checkout foi criado, mas não foi salvo aqui. Avise o suporte.' }, { status: 500 });
  try { await supabase.from('auditoria').insert({ acao: 'Cobrança gerada (TikPag)', detalhe: `${l.descricao} · ${parcela} · R$ ${valor.toFixed(2)}`, alvo_tipo: 'lancamento', alvo_id: l.id, autor_id: user.id, autor_nome: profile.nome_completo, autor_role: profile.role }); } catch (e) {}
  return NextResponse.json({ ok: true, url: ck.url });
}

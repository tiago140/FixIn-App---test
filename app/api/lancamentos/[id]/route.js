import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { hojeSP, dataValida, VALOR_MAXIMO } from '@/lib/lancamentos';

export const dynamic = 'force-dynamic';

// Ações sobre um lançamento: aprovar (contas a pagar), pagar, cancelar, reabrir. Só o DONO.
export async function PATCH(req, { params }) {
  const { user, profile, supabase } = await getProfile();
  if (!user || profile?.role !== 'master' || !profile.dono) return NextResponse.json({ error: 'sem permissão' }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  const { data: l } = await supabase.from('lancamentos').select('*').eq('id', params.id).maybeSingle();
  if (!l) return NextResponse.json({ error: 'Lançamento não encontrado.' }, { status: 404 });

  const agora = new Date().toISOString();
  let campos = { atualizado_em: agora };
  let rotulo = '';

  if (b.acao === 'aprovar') {
    if (l.tipo !== 'pagar' || l.status !== 'previsto') return NextResponse.json({ error: 'Só uma conta a pagar prevista pode ser aprovada.' }, { status: 400 });
    campos = { ...campos, status: 'aprovado', aprovado_por: user.id, aprovado_em: agora };
    rotulo = 'Conta a pagar aprovada';
  } else if (b.acao === 'pagar') {
    if (!['previsto', 'aprovado'].includes(l.status)) return NextResponse.json({ error: 'Este lançamento não está em aberto.' }, { status: 400 });
    if (l.tipo === 'pagar' && l.status !== 'aprovado') return NextResponse.json({ error: 'Aprove a conta a pagar antes de marcar como paga.' }, { status: 400 });
    const valorPago = b.valor === undefined || b.valor === '' ? Number(l.valor) : Math.round(Number(String(b.valor).replace(',', '.')) * 100) / 100;
    if (!(valorPago > 0) || valorPago > VALOR_MAXIMO) return NextResponse.json({ error: 'Informe um valor válido.' }, { status: 400 });
    const data = b.data || hojeSP();
    if (!dataValida(data)) return NextResponse.json({ error: 'Data inválida.' }, { status: 400 });
    const total = Math.min(Number(l.valor), Number(l.valor_pago || 0) + valorPago);
    campos = { ...campos, valor_pago: total, data_pagamento: data, status: total >= Number(l.valor) ? 'pago' : l.status };
    rotulo = total >= Number(l.valor) ? 'Lançamento pago' : 'Pagamento parcial registrado';
  } else if (b.acao === 'cancelar') {
    if (!['previsto', 'aprovado'].includes(l.status)) return NextResponse.json({ error: 'Só dá para cancelar um lançamento em aberto.' }, { status: 400 });
    campos = { ...campos, status: 'cancelado' };
    rotulo = 'Lançamento cancelado';
  } else if (b.acao === 'reabrir') {
    if (!['pago', 'cancelado'].includes(l.status)) return NextResponse.json({ error: 'Este lançamento já está em aberto.' }, { status: 400 });
    campos = { ...campos, status: 'previsto', valor_pago: 0, data_pagamento: null, aprovado_por: null, aprovado_em: null };
    rotulo = 'Lançamento reaberto';
  } else {
    return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
  }

  const { error } = await supabase.from('lancamentos').update(campos).eq('id', l.id);
  if (error) return NextResponse.json({ error: 'Não foi possível salvar.' }, { status: 400 });
  try { await supabase.from('auditoria').insert({ acao: rotulo, detalhe: `${l.descricao} · R$ ${Number(l.valor).toFixed(2)}`, alvo_tipo: 'lancamento', alvo_id: l.id, autor_id: user.id, autor_nome: profile.nome_completo, autor_role: profile.role }); } catch (e) {}
  return NextResponse.json({ ok: true });
}

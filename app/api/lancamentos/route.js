import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { TIPOS, VALOR_MAXIMO, dataValida } from '@/lib/lancamentos';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Cria um lançamento manual. Só o DONO (e o banco também confere, pelas regras de acesso).
export async function POST(req) {
  const { user, profile, supabase } = await getProfile();
  if (!user || profile?.role !== 'master' || !profile.dono) return NextResponse.json({ error: 'sem permissão' }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  const tipo = b.tipo;
  const descricao = String(b.descricao || '').trim().slice(0, 300);
  const valor = Math.round(Number(String(b.valor).replace(',', '.')) * 100) / 100;
  if (!TIPOS[tipo]) return NextResponse.json({ error: 'Tipo inválido.' }, { status: 400 });
  if (!descricao) return NextResponse.json({ error: 'Informe a descrição.' }, { status: 400 });
  if (!(valor > 0) || valor > VALOR_MAXIMO) return NextResponse.json({ error: 'Informe um valor válido.' }, { status: 400 });
  if (!dataValida(b.vencimento)) return NextResponse.json({ error: 'Informe o vencimento.' }, { status: 400 });
  const cliente_id = b.cliente_id && UUID.test(b.cliente_id) ? b.cliente_id : null;
  const prestador_id = b.prestador_id && UUID.test(b.prestador_id) ? b.prestador_id : null;
  const { data, error } = await supabase.from('lancamentos').insert({
    tipo, descricao, valor, vencimento: b.vencimento,
    categoria: String(b.categoria || '').trim().slice(0, 60) || null,
    observacao: String(b.observacao || '').trim().slice(0, 500) || null,
    cliente_id: tipo === 'receber' ? cliente_id : null,
    prestador_id: tipo === 'pagar' ? prestador_id : null,
    origem: 'manual', criado_por: user.id,
  }).select('id').single();
  if (error) return NextResponse.json({ error: 'Não foi possível salvar.' }, { status: 400 });
  try { await supabase.from('auditoria').insert({ acao: 'Lançamento criado', detalhe: `${TIPOS[tipo]} · ${descricao} · R$ ${valor.toFixed(2)}`, alvo_tipo: 'lancamento', alvo_id: data.id, autor_id: user.id, autor_nome: profile.nome_completo, autor_role: profile.role }); } catch (e) {}
  return NextResponse.json({ ok: true, id: data.id });
}

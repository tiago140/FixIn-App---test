import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { dataValida } from '@/lib/laudos';

const erro = (m, s = 400) => NextResponse.json({ error: m }, { status: s });

// Criar laudo: SÓ a equipe FixIn (master).
export async function POST(req) {
  const { user, profile, supabase } = await getProfile();
  if (!user || profile?.role !== 'master') return erro('sem permissão', 403);
  let b = {};
  try { b = await req.json(); } catch (e) {}

  const endereco = String(b.endereco || '').trim().slice(0, 200);
  if (!endereco) return erro('Informe o endereço do imóvel.');
  const titulo = String(b.titulo || '').trim().slice(0, 120);
  if (b.data_inspecao && !dataValida(b.data_inspecao)) return erro('Data da inspeção inválida.');

  const { data: cliente } = await supabase.from('clientes').select('id, ativo, nome_empresa').eq('id', b.cliente_id).maybeSingle();
  if (!cliente) return erro('Escolha a imobiliária.');
  if (cliente.ativo === false) return erro('Esta imobiliária está desativada.', 409);

  if (b.orcamento_id) {
    const { data: o } = await supabase.from('orcamentos').select('id, cliente_id').eq('id', b.orcamento_id).maybeSingle();
    if (!o || o.cliente_id !== cliente.id) return erro('O orçamento escolhido não é desta imobiliária.');
  }

  const novo = { cliente_id: cliente.id, endereco, orcamento_id: b.orcamento_id || null, criado_por: user.id };
  if (titulo) novo.titulo = titulo;
  if (b.data_inspecao) novo.data_inspecao = b.data_inspecao;
  const { data: criado, error } = await supabase.from('laudos').insert(novo).select('id, numero').single();
  if (error) return erro(error.message);

  try {
    await supabase.from('auditoria').insert({ acao: 'Criou laudo de inspeção', detalhe: `${criado.numero} — ${cliente.nome_empresa} — ${endereco}`, alvo_tipo: 'laudo', alvo_id: criado.id, autor_id: user.id, autor_nome: profile.nome_completo, autor_role: profile.role });
  } catch (e) {}
  return NextResponse.json({ ok: true, id: criado.id, numero: criado.numero });
}

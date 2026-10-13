import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { limparCadastro } from '@/lib/prestadores';

// Equipe FixIn edita o cadastro completo (inclui ativar/desativar e a carteira Asaas).
export async function PATCH(req, { params }) {
  const { user, profile, supabase } = await getProfile();
  if (!user || profile?.role !== 'master') return NextResponse.json({ error: 'sem permissão' }, { status: 403 });
  const body = await req.json();
  const dados = limparCadastro(body);
  if (!dados.nome) return NextResponse.json({ error: 'informe o nome' }, { status: 400 });
  dados.asaas_wallet_id = String(body.asaas_wallet_id ?? '').trim().slice(0, 80) || null;
  if (typeof body.ativo === 'boolean') dados.ativo = body.ativo;
  dados.atualizado_em = new Date().toISOString();
  const { error } = await supabase.from('prestadores').update(dados).eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  try {
    await supabase.from('auditoria').insert({ acao: 'Editou cadastro do prestador', detalhe: dados.nome, alvo_tipo: 'prestador', alvo_id: params.id, autor_id: user.id, autor_nome: profile.nome_completo, autor_role: profile.role });
  } catch (e) {}
  return NextResponse.json({ ok: true });
}

import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { createAdminClient } from '@/lib/supabase/admin';
import { limparCadastro, CAMPOS_DO_PROPRIO } from '@/lib/prestadores';

// O prestador atualiza os próprios dados (contato, CPF/CNPJ, banco, Pix).
export async function PATCH(req) {
  const { user, profile } = await getProfile();
  if (!user || profile?.role !== 'prestador' || !profile.prestador_id) return NextResponse.json({ error: 'sem permissão' }, { status: 403 });
  const limpo = limparCadastro(await req.json());
  const dados = {};
  for (const c of CAMPOS_DO_PROPRIO) dados[c] = limpo[c];
  dados.atualizado_em = new Date().toISOString();
  const admin = createAdminClient();
  const { error } = await admin.from('prestadores').update(dados).eq('id', profile.prestador_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  try {
    await admin.from('auditoria').insert({ acao: 'Prestador atualizou os próprios dados', detalhe: profile.nome_completo, alvo_tipo: 'prestador', alvo_id: profile.prestador_id, autor_id: user.id, autor_nome: profile.nome_completo, autor_role: 'prestador' });
  } catch (e) {}
  return NextResponse.json({ ok: true });
}

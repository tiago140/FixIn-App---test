import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { createAdminClient } from '@/lib/supabase/admin';
import { limparCadastro } from '@/lib/prestadores';
import { liberarAcessoPrestador } from '@/lib/acessoPrestador';

export const dynamic = 'force-dynamic';

// A equipe aprova (vira prestador ativo) ou recusa um cadastro recebido pelo link externo.
export async function POST(req, { params }) {
  const { user, profile } = await getProfile();
  if (!user || profile?.role !== 'master') return NextResponse.json({ error: 'sem permissão' }, { status: 403 });
  const { acao } = await req.json().catch(() => ({}));
  const admin = createAdminClient();
  const { data: c } = await admin.from('prestadores_cadastros').select('*').eq('id', params.id).maybeSingle();
  if (!c) return NextResponse.json({ error: 'não encontrado' }, { status: 404 });
  if (c.status !== 'pendente') return NextResponse.json({ error: 'Este cadastro já foi decidido.' }, { status: 409 });
  const agora = new Date().toISOString();

  if (acao === 'recusar') {
    await admin.from('prestadores_cadastros').update({ status: 'recusado', decidido_em: agora, decidido_por: user.id }).eq('id', c.id);
    return NextResponse.json({ ok: true });
  }
  if (acao !== 'aprovar') return NextResponse.json({ error: 'ação inválida' }, { status: 400 });

  // reivindica o cadastro antes de criar (dois cliques seguidos não criam dois prestadores)
  const { data: pego } = await admin.from('prestadores_cadastros').update({ status: 'aprovado', decidido_em: agora, decidido_por: user.id }).eq('id', c.id).eq('status', 'pendente').select('id');
  if (!pego?.length) return NextResponse.json({ error: 'Este cadastro já foi decidido.' }, { status: 409 });
  const dados = { ...limparCadastro(c.dados), ativo: true };
  if (c.dados?.experiencia) dados.nome = dados.nome; // a experiência fica só no registro do cadastro
  const { data: novo, error } = await admin.from('prestadores').insert(dados).select('id').single();
  if (error) {
    await admin.from('prestadores_cadastros').update({ status: 'pendente', decidido_em: null, decidido_por: null }).eq('id', c.id);
    return NextResponse.json({ error: 'Não foi possível criar o prestador: ' + error.message }, { status: 400 });
  }
  await admin.from('prestadores_cadastros').update({ prestador_id: novo.id }).eq('id', c.id);

  const { acesso, aviso, senha } = await liberarAcessoPrestador(admin, { ...dados, id: novo.id }, { aprovacao: true });
  try { await admin.from('auditoria').insert({ acao: 'Aprovou cadastro externo de prestador', detalhe: dados.nome, alvo_tipo: 'prestador', alvo_id: novo.id, autor_id: user.id, autor_nome: profile.nome_completo, autor_role: profile.role }); } catch (e) {}
  return NextResponse.json({ ok: true, id: novo.id, acesso, aviso, senha });
}

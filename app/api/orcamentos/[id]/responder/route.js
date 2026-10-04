import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { enviarEmailStatusOrcamento } from '@/lib/email';

export async function POST(req, { params }) {
  const { user, profile, supabase } = await getProfile();
  if (!user || profile?.role === 'master') {
    return NextResponse.json({ error: 'sem permissão' }, { status: 403 });
  }
  const id = params.id;
  const { status } = await req.json();
  if (!['aprovado', 'rejeitado'].includes(status)) {
    return NextResponse.json({ error: 'status inválido' }, { status: 400 });
  }

  const { error } = await supabase.rpc('responder_orcamento', { p_orcamento_id: id, p_novo_status: status });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const { data: orc } = await supabase.from('orcamentos_cliente').select('numero, endereco').eq('id', id).single();
  const { data: cli } = await supabase.from('clientes').select('nome_empresa, email').eq('id', profile.cliente_id).maybeSingle();

  await supabase.from('auditoria').insert({
    acao: status === 'aprovado' ? 'Aprovou o orçamento' : 'Recusou o orçamento',
    detalhe: orc?.numero || '',
    alvo_tipo: 'orcamento', alvo_id: id,
    autor_id: user.id, autor_nome: profile.nome_completo, autor_role: profile.role,
  });

  if (status === 'aprovado' && orc) {
    await enviarEmailStatusOrcamento({
      paraEmail: cli?.email,
      nomeImobiliaria: cli?.nome_empresa,
      numero: orc.numero,
      endereco: orc.endereco,
      status: 'aprovado',
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}

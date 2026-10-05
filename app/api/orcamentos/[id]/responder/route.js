import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { enviarEmailStatusOrcamento } from '@/lib/email';
import { createAdminClient } from '@/lib/supabase/admin';
import { destinatariosDoOrcamento } from '@/lib/destinatarios';

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
  if (error) {
    const aindaEmPreparo = /em preparação/i.test(error.message);
    return NextResponse.json({ error: aindaEmPreparo ? 'A FixIn ainda está preparando este orçamento. A aprovação libera quando ele for enviado.' : error.message }, { status: aindaEmPreparo ? 409 : 400 });
  }

  const { data: orc } = await supabase.from('orcamentos_cliente').select('numero, endereco').eq('id', id).single();
  const { data: cli } = await supabase.from('clientes').select('nome_empresa, email').eq('id', profile.cliente_id).maybeSingle();

  await supabase.from('auditoria').insert({
    acao: status === 'aprovado' ? 'Aprovou o orçamento' : 'Recusou o orçamento',
    detalhe: orc?.numero || '',
    alvo_tipo: 'orcamento', alvo_id: id,
    autor_id: user.id, autor_nome: profile.nome_completo, autor_role: profile.role,
  });

  if (status === 'aprovado' && orc) {
    // o operacional não consegue ler quem criou o pedido, então a consulta dos destinatários usa o acesso do servidor
    const destino = await destinatariosDoOrcamento(createAdminClient(), id);
    await enviarEmailStatusOrcamento({
      paraEmail: destino.emails,
      nomeImobiliaria: cli?.nome_empresa,
      numero: orc.numero,
      endereco: orc.endereco,
      status: 'aprovado',
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}

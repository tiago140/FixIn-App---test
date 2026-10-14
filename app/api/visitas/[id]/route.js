import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { avisarImobiliariaVisita } from '@/lib/visitasEmail';
import { paraInstanteBrasilia } from '@/lib/fuso';

export async function PATCH(req, { params }) {
  const { user, profile, supabase } = await getProfile();
  if (!user) return NextResponse.json({ error: 'não autenticado' }, { status: 401 });
  const { status, prestador_id, data_hora_sugerida: sugeridaBruta } = await req.json();
  const data_hora_sugerida = paraInstanteBrasilia(sugeridaBruta);
  if (sugeridaBruta && !data_hora_sugerida) return NextResponse.json({ error: 'data e hora inválidas' }, { status: 400 });
  const id = params.id;

  const { data: visita } = await supabase.from('visitas').select('*').eq('id', id).single();
  if (!visita) return NextResponse.json({ error: 'visita não encontrada' }, { status: 404 });

  if (profile.role === 'master') {
    // Sugerir outra data: vira uma contraproposta pra imobiliária aceitar, não confirma sozinho.
    if (status === 'sugerida') {
      if (!data_hora_sugerida) return NextResponse.json({ error: 'informe a data sugerida' }, { status: 400 });
      const { error } = await supabase
        .from('visitas')
        .update({ status: 'sugerida', data_hora_sugerida, atualizado_em: new Date().toISOString() })
        .eq('id', id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      await supabase.from('auditoria').insert({
        acao: 'Sugeriu outra data de visita',
        detalhe: `${visita.endereco}: nova data proposta`,
        alvo_tipo: 'visita', alvo_id: id,
        autor_id: user.id, autor_nome: profile.nome_completo, autor_role: profile.role,
      });
      await avisarImobiliariaVisita({ ...visita, data_hora: data_hora_sugerida }, 'sugerida');
      return NextResponse.json({ ok: true });
    }
    const patch = { atualizado_em: new Date().toISOString() };
    if (status) patch.status = status;
    if (prestador_id !== undefined) patch.prestador_id = prestador_id || null;
    const { error } = await supabase.from('visitas').update(patch).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    if (status && status !== visita.status && ['confirmada', 'cancelada'].includes(status)) await avisarImobiliariaVisita(visita, status);
    return NextResponse.json({ ok: true });
  }

  // imobiliária: cancelar a própria visita pendente, ou responder a uma contraproposta ('sugerida')
  if (status === 'confirmada' || status === 'cancelada') {
    const { error } = await supabase.rpc('responder_visita_imobiliaria', { p_visita_id: id, p_novo_status: status });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    await supabase.from('auditoria').insert({
      acao: status === 'confirmada' ? 'Aceitou nova data de visita' : 'Recusou/cancelou visita',
      detalhe: visita.endereco || '',
      alvo_tipo: 'visita', alvo_id: id,
      autor_id: user.id, autor_nome: profile.nome_completo, autor_role: profile.role,
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'sem permissão' }, { status: 403 });
}

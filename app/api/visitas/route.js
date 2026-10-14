import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { avisarImobiliariaVisita } from '@/lib/visitasEmail';
import { paraInstanteBrasilia } from '@/lib/fuso';

export async function POST(req) {
  const { user, profile, supabase } = await getProfile();
  if (!user) return NextResponse.json({ error: 'não autenticado' }, { status: 401 });

  const { cliente_id, endereco, data_hora: dataHoraBruta, responsavel, prestador_id, observacoes } = await req.json();
  if (!endereco) return NextResponse.json({ error: 'informe o endereço' }, { status: 400 });
  // o horário digitado é de Brasília (o navegador manda sem fuso e o servidor lê como UTC)
  const data_hora = paraInstanteBrasilia(dataHoraBruta);
  if (dataHoraBruta && !data_hora) return NextResponse.json({ error: 'data e hora inválidas' }, { status: 400 });

  if (profile.role === 'master') {
    if (!cliente_id) return NextResponse.json({ error: 'selecione a imobiliária' }, { status: 400 });
    const { error } = await supabase.from('visitas').insert({
      cliente_id, endereco, data_hora: data_hora || null, responsavel, prestador_id: prestador_id || null,
      observacoes, status: 'confirmada', criado_por_role: 'master', criado_por: user.id,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    await avisarImobiliariaVisita({ cliente_id, endereco, data_hora, criado_por: null }, 'agendada');
    return NextResponse.json({ ok: true });
  }

  // imobiliária: usa a função seguro que já define cliente_id e status 'pendente'
  const { data, error } = await supabase.rpc('solicitar_visita', {
    p_endereco: endereco,
    p_data_hora: data_hora || null,
    p_observacoes: observacoes || null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, id: data });
}

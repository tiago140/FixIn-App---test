import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { createAdminClient } from '@/lib/supabase/admin';
import { guardarArquivo, removerArquivo, LIMITE_FOTOS_OS } from '@/lib/ordensArquivos';
import { UUID } from '@/lib/acompanhamento';

export const dynamic = 'force-dynamic';

// Equipe: lança uma anotação (JSON) ou uma foto com legenda (form-data: arquivo, legenda).
export async function POST(req, { params }) {
  const { user, profile } = await getProfile();
  if (!user || profile?.role !== 'master') return NextResponse.json({ error: 'sem permissão' }, { status: 403 });
  if (!UUID.test(params.id)) return NextResponse.json({ error: 'inválido' }, { status: 400 });
  const admin = createAdminClient();
  const { data: a } = await admin.from('acompanhamentos').select('id').eq('id', params.id).maybeSingle();
  if (!a) return NextResponse.json({ error: 'não encontrado' }, { status: 404 });
  const ehForm = (req.headers.get('content-type') || '').includes('multipart/form-data');

  if (!ehForm) {
    const b = await req.json().catch(() => ({}));
    const texto = String(b.texto || '').trim().slice(0, 2000);
    if (texto.length < 3) return NextResponse.json({ error: 'Escreva o que foi feito.' }, { status: 400 });
    await admin.from('acompanhamento_eventos').insert({ acompanhamento_id: a.id, tipo: 'nota', texto, publico: b.publico !== false, autor_nome: profile.nome_completo || null, autor_tipo: 'equipe' });
    await admin.from('acompanhamentos').update({ atualizado_em: new Date().toISOString() }).eq('id', a.id);
    return NextResponse.json({ ok: true });
  }

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: 'Envio inválido.' }, { status: 400 });
  const { count } = await admin.from('acompanhamento_eventos').select('id', { count: 'exact', head: true }).eq('acompanhamento_id', a.id).eq('tipo', 'foto');
  if ((count || 0) >= LIMITE_FOTOS_OS * 3) return NextResponse.json({ error: 'Limite de fotos deste acompanhamento atingido.' }, { status: 400 });
  const r = await guardarArquivo(`obra-${a.id}`, 'fotos', form);
  if (r.erro) return NextResponse.json({ error: r.erro }, { status: r.status });
  const { error } = await admin.from('acompanhamento_eventos').insert({
    acompanhamento_id: a.id, tipo: 'foto', path: r.path, legenda: String(form.get('legenda') || '').trim().slice(0, 200) || null,
    publico: form.get('publico') !== '0', autor_nome: profile.nome_completo || null, autor_tipo: 'equipe',
  });
  if (error) { await removerArquivo(r.path); return NextResponse.json({ error: 'Não foi possível salvar a foto.' }, { status: 500 }); }
  await admin.from('acompanhamentos').update({ atualizado_em: new Date().toISOString() }).eq('id', a.id);
  return NextResponse.json({ ok: true });
}

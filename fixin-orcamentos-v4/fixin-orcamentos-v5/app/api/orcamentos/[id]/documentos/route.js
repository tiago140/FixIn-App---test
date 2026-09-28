import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';

export async function POST(req, { params }) {
  const { user, profile, supabase } = await getProfile();
  if (!user || profile?.role !== 'master') {
    return NextResponse.json({ error: 'sem permissão' }, { status: 403 });
  }
  const id = params.id;
  const formData = await req.formData();
  const file = formData.get('arquivo');
  const tipo = formData.get('tipo');
  const numero = formData.get('numero') || '';

  if (!file || !tipo) return NextResponse.json({ error: 'selecione o arquivo e o tipo' }, { status: 400 });

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const caminho = `${id}/${Date.now()}-${file.name}`;

  const { error: erroUpload } = await supabase.storage
    .from('documentos-fiscais')
    .upload(caminho, buffer, { contentType: file.type, upsert: false });
  if (erroUpload) return NextResponse.json({ error: erroUpload.message }, { status: 400 });

  const { error: erroInsert } = await supabase.from('orcamento_documentos_fiscais').insert({
    orcamento_id: id, tipo, numero, arquivo_path: caminho, criado_por: user.id,
  });
  if (erroInsert) return NextResponse.json({ error: erroInsert.message }, { status: 400 });

  const { data: urlData } = supabase.storage.from('documentos-fiscais').getPublicUrl(caminho);
  return NextResponse.json({ ok: true, url: urlData.publicUrl });
}

export async function DELETE(req, { params }) {
  const { user, profile, supabase } = await getProfile();
  if (!user || profile?.role !== 'master') {
    return NextResponse.json({ error: 'sem permissão' }, { status: 403 });
  }
  const { docId } = await req.json();
  const { error } = await supabase.from('orcamento_documentos_fiscais').delete().eq('id', docId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

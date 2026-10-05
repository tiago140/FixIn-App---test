import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { createAdminClient } from '@/lib/supabase/admin';
import { BUCKET, LIMITE_FOTOS, TAMANHO_MAX_FOTO, tipoDaImagem } from '@/lib/laudos';

export const runtime = 'nodejs';
export const maxDuration = 30;
const erro = (m, s = 400) => NextResponse.json({ error: m }, { status: s });

// Sobe UMA foto por vez (a tela já reduz cada foto antes de enviar). SÓ a equipe FixIn.
export async function POST(req, { params }) {
  const { user, profile, supabase } = await getProfile();
  if (!user || profile?.role !== 'master') return erro('sem permissão', 403);
  const { data: laudo } = await supabase.from('laudos').select('id, fotos').eq('id', params.id).maybeSingle();
  if (!laudo) return erro('laudo não encontrado', 404);
  if ((laudo.fotos || []).length >= LIMITE_FOTOS) return erro(`Limite de ${LIMITE_FOTOS} fotos por laudo.`, 409);

  let form;
  try { form = await req.formData(); } catch (e) { return erro('envio inválido'); }
  const arquivo = form.get('arquivo');
  if (!arquivo || typeof arquivo.arrayBuffer !== 'function') return erro('Nenhuma foto recebida.');
  if (arquivo.size > TAMANHO_MAX_FOTO) return erro('A foto é grande demais (máximo 4 MB). Tente de novo.', 413);
  const bytes = Buffer.from(await arquivo.arrayBuffer());
  const tipo = tipoDaImagem(bytes);
  if (!tipo) return erro('Formato não aceito: use fotos JPG ou PNG.', 415);

  const id = crypto.randomUUID();
  const caminho = `${laudo.id}/fotos/${id}.${tipo.ext}`;
  const admin = createAdminClient();
  const { error: eUp } = await admin.storage.from(BUCKET).upload(caminho, bytes, { contentType: tipo.mime, upsert: false });
  if (eUp) return erro('Não consegui salvar a foto: ' + eUp.message, 500);

  const legenda = String(form.get('legenda') || '').replace(/\s+/g, ' ').trim().slice(0, 300);
  const foto = { id, path: caminho, legenda };
  const { error } = await supabase.from('laudos').update({ fotos: [...(laudo.fotos || []), foto], atualizado_em: new Date().toISOString() }).eq('id', laudo.id);
  if (error) {
    await admin.storage.from(BUCKET).remove([caminho]);
    return erro(error.message);
  }
  return NextResponse.json({ ok: true, foto: { id, legenda } });
}

import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { createAdminClient } from '@/lib/supabase/admin';
import { receberFoto, PODE_ENVIAR_FOTO } from '@/lib/ordensExec';
import { removerArquivo } from '@/lib/ordensArquivos';

export const runtime = 'nodejs';
export const maxDuration = 30;
const erro = (m, s = 400) => NextResponse.json({ error: m }, { status: s });

async function minhaOrdem(params) {
  const { user, profile } = await getProfile();
  if (!user || profile?.role !== 'prestador' || !profile.prestador_id) return null;
  const admin = createAdminClient();
  const { data: os } = await admin.from('ordens_servico').select('*').eq('id', params.id).eq('prestador_id', profile.prestador_id).maybeSingle();
  return os ? { admin, os } : null;
}

// Sobe UMA foto por vez (a tela reduz cada foto antes de enviar).
export async function POST(req, { params }) {
  const c = await minhaOrdem(params);
  if (!c) return erro('sem permissão', 403);
  let form; try { form = await req.formData(); } catch (e) { return erro('envio inválido'); }
  const r = await receberFoto(c.admin, c.os, form, 'prestador');
  if (r.erro) return erro(r.erro, r.status);
  return NextResponse.json({ ok: true, id: r.id });
}

export async function DELETE(req, { params }) {
  const c = await minhaOrdem(params);
  if (!c) return erro('sem permissão', 403);
  if (!PODE_ENVIAR_FOTO.includes(c.os.status)) return erro('Não dá para remover fotos agora.', 409);
  const id = new URL(req.url).searchParams.get('foto');
  const { data: f } = await c.admin.from('os_fotos').select('id, path, rodada, tipo').eq('id', id).eq('os_id', c.os.id).maybeSingle();
  if (!f || f.tipo === 'reprovacao' || f.rodada !== (c.os.rodada || 0)) return erro('foto não encontrada', 404);
  await c.admin.from('os_fotos').delete().eq('id', f.id);
  await removerArquivo(f.path);
  return NextResponse.json({ ok: true });
}

import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { createAdminClient } from '@/lib/supabase/admin';
import { guardarArquivo, removerArquivo, TAMANHO_MAX_FOTO, LIMITE_FOTOS_OS } from '@/lib/ordensArquivos';

export const runtime = 'nodejs';
export const maxDuration = 30;
const erro = (m, s = 400) => NextResponse.json({ error: m }, { status: s });

// A equipe anexa fotos do que foi reprovado (valem para a próxima rodada, que é a que o prestador verá).
export async function POST(req, { params }) {
  const { user, profile } = await getProfile();
  if (!user || profile?.role !== 'master') return erro('sem permissão', 403);
  const admin = createAdminClient();
  const { data: os } = await admin.from('ordens_servico').select('id, status, rodada').eq('id', params.id).maybeSingle();
  if (!os) return erro('ordem não encontrada', 404);
  if (os.status !== 'conclusao_pendente') return erro('Só dá para anexar fotos de reprovação enquanto a conclusão está em análise.', 409);
  const { count } = await admin.from('os_fotos').select('id', { count: 'exact', head: true }).eq('os_id', os.id);
  if ((count || 0) >= LIMITE_FOTOS_OS) return erro(`Limite de ${LIMITE_FOTOS_OS} fotos por ordem.`, 409);
  let form; try { form = await req.formData(); } catch (e) { return erro('envio inválido'); }
  const r = await guardarArquivo(os.id, 'reprovacao', form, { max: TAMANHO_MAX_FOTO });
  if (r.erro) return erro(r.erro, r.status);
  const legenda = String(form.get('legenda') || '').replace(/\s+/g, ' ').trim().slice(0, 300) || null;
  const { error } = await admin.from('os_fotos').insert({ os_id: os.id, tipo: 'reprovacao', rodada: (os.rodada || 0) + 1, path: r.path, legenda, origem: 'equipe' });
  if (error) { await removerArquivo(r.path); return erro(error.message); }
  return NextResponse.json({ ok: true });
}

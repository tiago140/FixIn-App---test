import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { BUCKET_OS } from '@/lib/ordensArquivos';
import { receberFoto, concluirOS, PODE_ENVIAR_FOTO } from '@/lib/ordensExec';

export const runtime = 'nodejs';
export const maxDuration = 30;
export const dynamic = 'force-dynamic';
const erro = (m, s = 400) => NextResponse.json({ error: m }, { status: s });

// Link de fotos da rua: quem tem o link (criado pela FixIn) envia fotos e conclui, sem login.
async function ordemDoToken(token) {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(String(token || ''))) return null;
  const admin = createAdminClient();
  const { data: os } = await admin.from('ordens_servico').select('*, prestadores(nome)').eq('token_fotos', token).maybeSingle();
  if (!os) return null;
  if (os.token_expira && new Date(os.token_expira) < new Date()) return null;
  return { admin, os };
}

export async function GET(_req, { params }) {
  const c = await ordemDoToken(params.token);
  if (!c) return erro('Link inválido ou expirado. Peça um novo link à FixIn.', 404);
  const { data: fotos } = await c.admin.from('os_fotos').select('id, tipo, rodada, path, legenda').eq('os_id', c.os.id).order('criado_em', { ascending: true });
  const atuais = (fotos || []).filter((f) => f.rodada === (c.os.rodada || 0));
  const comUrl = [];
  for (const f of atuais) {
    const { data } = await c.admin.storage.from(BUCKET_OS).createSignedUrl(f.path, 600);
    comUrl.push({ id: f.id, tipo: f.tipo, legenda: f.legenda, url: data?.signedUrl || null });
  }
  return NextResponse.json({
    numero: c.os.numero, endereco: c.os.endereco, status: c.os.status, aberta: PODE_ENVIAR_FOTO.includes(c.os.status),
    prestador: c.os.prestadores?.nome || '', reprovacao_motivo: c.os.status === 'reprovada' ? c.os.reprovacao_motivo : null,
    fotos: comUrl,
  });
}

export async function POST(req, { params }) {
  const c = await ordemDoToken(params.token);
  if (!c) return erro('Link inválido ou expirado. Peça um novo link à FixIn.', 404);
  const tipoConteudo = req.headers.get('content-type') || '';
  if (tipoConteudo.includes('application/json')) {
    const b = await req.json().catch(() => ({}));
    if (b.acao !== 'concluir') return erro('ação inválida');
    const r = await concluirOS(c.admin, c.os, b.obs, c.os.prestadores?.nome || 'Prestador (link)');
    if (r.erro) return erro(r.erro, r.status);
    return NextResponse.json({ ok: true });
  }
  let form; try { form = await req.formData(); } catch (e) { return erro('envio inválido'); }
  const r = await receberFoto(c.admin, c.os, form, 'link');
  if (r.erro) return erro(r.erro, r.status);
  return NextResponse.json({ ok: true, id: r.id });
}

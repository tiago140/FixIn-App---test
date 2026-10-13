import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { createAdminClient } from '@/lib/supabase/admin';
import { guardarArquivo, removerArquivo, TAMANHO_MAX_DOC } from '@/lib/ordensArquivos';

export const runtime = 'nodejs';
export const maxDuration = 30;
const erro = (m, s = 400) => NextResponse.json({ error: m }, { status: s });

async function minhaOrdem(params) {
  const { user, profile } = await getProfile();
  if (!user || profile?.role !== 'prestador' || !profile.prestador_id) return null;
  const admin = createAdminClient();
  const { data: os } = await admin.from('ordens_servico').select('id, status, numero, endereco').eq('id', params.id).eq('prestador_id', profile.prestador_id).maybeSingle();
  return os ? { admin, os, profile } : null;
}

// O prestador anexa a nota fiscal (PDF, JPG ou PNG) depois que o serviço foi concluído.
export async function POST(req, { params }) {
  const c = await minhaOrdem(params);
  if (!c) return erro('sem permissão', 403);
  if (!['conclusao_pendente', 'aprovada', 'paga'].includes(c.os.status)) return erro('A nota fiscal pode ser anexada depois que o serviço é concluído.', 409);
  let form; try { form = await req.formData(); } catch (e) { return erro('envio inválido'); }
  const r = await guardarArquivo(c.os.id, 'nf', form, { permitePdf: true, max: TAMANHO_MAX_DOC });
  if (r.erro) return erro(r.erro, r.status);
  const valor = Number(String(form.get('valor') || '').replace(',', '.'));
  const { error } = await c.admin.from('os_notas').insert({
    os_id: c.os.id, path: r.path, nome_arquivo: r.nome || null,
    numero: String(form.get('numero') || '').trim().slice(0, 40) || null,
    valor: Number.isFinite(valor) && valor > 0 ? Math.round(valor * 100) / 100 : null,
  });
  if (error) { await removerArquivo(r.path); return erro(error.message); }
  try { await c.admin.from('auditoria').insert({ acao: 'Prestador anexou nota fiscal', detalhe: `${c.os.numero} · ${c.os.endereco}`, alvo_tipo: 'ordem_servico', alvo_id: c.os.id, autor_nome: c.profile.nome_completo, autor_role: 'prestador' }); } catch (e) {}
  return NextResponse.json({ ok: true });
}

export async function DELETE(req, { params }) {
  const c = await minhaOrdem(params);
  if (!c) return erro('sem permissão', 403);
  if (c.os.status === 'paga') return erro('Ordem já paga: fale com a FixIn para alterar a nota.', 409);
  const id = new URL(req.url).searchParams.get('nota');
  const { data: n } = await c.admin.from('os_notas').select('id, path').eq('id', id).eq('os_id', c.os.id).maybeSingle();
  if (!n) return erro('nota não encontrada', 404);
  await c.admin.from('os_notas').delete().eq('id', n.id);
  await removerArquivo(n.path);
  return NextResponse.json({ ok: true });
}

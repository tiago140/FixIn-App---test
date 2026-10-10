import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { hashToken, limpar, validarArquivos, salvarAnexos } from '@/lib/chamados';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req, { params }) {
  const admin = createAdminClient();
  const { data: ch } = await admin.from('chamados').select('id, status, solicitante_nome').eq('token_hash', hashToken(params.token)).maybeSingle();
  if (!ch) return NextResponse.json({ error: 'Link inválido.' }, { status: 404 });
  if (ch.status === 'cancelado') return NextResponse.json({ error: 'Este chamado foi cancelado.' }, { status: 409 });

  let fd;
  try { fd = await req.formData(); } catch (e) { return NextResponse.json({ error: 'Envio inválido.' }, { status: 400 }); }
  const texto = limpar(fd.get('texto'), 2000);
  const files = fd.getAll('arquivos').filter((f) => f && typeof f === 'object' && f.size > 0);
  if (!texto && files.length === 0) return NextResponse.json({ error: 'Escreva uma mensagem ou anexe um arquivo.' }, { status: 400 });
  const erroArq = await validarArquivos(files);
  if (erroArq) return NextResponse.json({ error: erroArq }, { status: 400 });

  // limite: 30 mensagens por hora por chamado
  const { count } = await admin.from('chamado_mensagens').select('id', { count: 'exact', head: true }).eq('chamado_id', ch.id).eq('autor_tipo', 'externo').gte('criado_em', new Date(Date.now() - 3600000).toISOString());
  if ((count || 0) >= 30) return NextResponse.json({ error: 'Muitas mensagens em pouco tempo.' }, { status: 429 });

  if (texto) await admin.from('chamado_mensagens').insert({ chamado_id: ch.id, autor_tipo: 'externo', autor_nome: ch.solicitante_nome, texto });
  if (files.length) await salvarAnexos(admin, ch.id, files, { tipo: 'externo', nome: ch.solicitante_nome });
  await admin.from('chamados').update({ atualizado_em: new Date().toISOString() }).eq('id', ch.id);
  return NextResponse.json({ ok: true });
}

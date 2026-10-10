import { avisarSolicitante } from '@/lib/chamadosEmail';
import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { createAdminClient } from '@/lib/supabase/admin';
import { acessoChamado, limpar, validarArquivos, salvarAnexos } from '@/lib/chamados';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req, { params }) {
  const a = await acessoChamado(getProfile, params.id);
  if (a.erro) return NextResponse.json({ error: a.erro }, { status: a.status });
  let fd;
  try { fd = await req.formData(); } catch (e) { return NextResponse.json({ error: 'Envio inválido.' }, { status: 400 }); }
  const texto = limpar(fd.get('texto'), 3000);
  const files = fd.getAll('arquivos').filter((f) => f && typeof f === 'object' && f.size > 0);
  if (!texto && files.length === 0) return NextResponse.json({ error: 'Escreva uma mensagem ou anexe um arquivo.' }, { status: 400 });
  const erroArq = validarArquivos(files);
  if (erroArq) return NextResponse.json({ error: erroArq }, { status: 400 });

  const admin = createAdminClient();
  const tipo = a.profile.role === 'master' ? 'fixin' : 'imobiliaria';
  const nome = a.profile.nome_completo || (tipo === 'fixin' ? 'FixIn' : 'Imobiliária');
  if (texto) await admin.from('chamado_mensagens').insert({ chamado_id: a.chamado.id, autor_tipo: tipo, autor_nome: nome, texto });
  if (files.length) await salvarAnexos(admin, a.chamado.id, files, { tipo, nome });
  await admin.from('chamados').update({ atualizado_em: new Date().toISOString() }).eq('id', a.chamado.id);
  await avisarSolicitante(admin, a.chamado, 'resposta');
  return NextResponse.json({ ok: true });
}

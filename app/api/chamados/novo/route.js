import { avisarSolicitante } from '@/lib/chamadosEmail';
import { criarCodigoAcesso } from '@/lib/chamados';
import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { createAdminClient } from '@/lib/supabase/admin';
import { novoToken, camposToken, digitosTelefone, limpar, emailValido, validarArquivos, salvarAnexos } from '@/lib/chamados';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Chamado aberto POR DENTRO do sistema (dono ou imobiliária), em nome de um locatário/locador.
export async function POST(req) {
  const { user, profile } = await getProfile();
  if (!user || !['master', 'imobiliaria'].includes(profile?.role)) return NextResponse.json({ error: 'sem permissão' }, { status: 403 });
  let fd;
  try { fd = await req.formData(); } catch (e) { return NextResponse.json({ error: 'Envio inválido.' }, { status: 400 }); }
  const clienteId = profile.role === 'master' ? limpar(fd.get('cliente_id'), 60) : profile.cliente_id;
  const tipo = fd.get('tipo') === 'locador' ? 'locador' : 'locatario';
  const nome = limpar(fd.get('nome'), 120), email = limpar(fd.get('email'), 200).toLowerCase(), telefone = limpar(fd.get('telefone'), 30);
  const endereco = limpar(fd.get('endereco'), 250), titulo = limpar(fd.get('titulo'), 120), descricao = limpar(fd.get('descricao'), 3000);
  const files = fd.getAll('arquivos').filter((f) => f && typeof f === 'object' && f.size > 0);
  if (!clienteId) return NextResponse.json({ error: 'Selecione a imobiliária.' }, { status: 400 });
  if (!nome || !endereco || !titulo || !descricao) return NextResponse.json({ error: 'Preencha nome, endereço, assunto e descrição.' }, { status: 400 });
  if (email && !emailValido(email)) return NextResponse.json({ error: 'E-mail inválido.' }, { status: 400 });
  const erroArq = validarArquivos(files);
  if (erroArq) return NextResponse.json({ error: erroArq }, { status: 400 });

  const admin = createAdminClient();
  const token = novoToken();
  const { data: ch, error } = await admin.from('chamados').insert({
    cliente_id: clienteId, solicitante_tipo: tipo, solicitante_nome: nome, solicitante_email: email || null, solicitante_telefone: telefone || null,
    endereco, titulo, descricao, ...camposToken(token), telefone_digitos: digitosTelefone(telefone) || null,
  }).select('*').single();
  if (error || !ch) return NextResponse.json({ error: 'Não foi possível abrir o chamado.' }, { status: 500 });
  if (files.length) await salvarAnexos(admin, ch.id, files, { tipo: profile.role === 'master' ? 'fixin' : 'imobiliaria', nome: profile.nome_completo || 'Equipe' });
  const codigo = await criarCodigoAcesso(admin, ch.id);
  await avisarSolicitante(admin, ch, 'aberto', { codigo });
  try { await admin.from('auditoria').insert({ acao: 'Chamado aberto internamente', detalhe: `${ch.numero} · ${tipo}`, alvo_tipo: 'chamado', alvo_id: ch.id, autor_nome: profile.nome_completo, autor_role: profile.role }); } catch (e) {}
  return NextResponse.json({ ok: true, id: ch.id, numero: ch.numero, token, codigo });
}

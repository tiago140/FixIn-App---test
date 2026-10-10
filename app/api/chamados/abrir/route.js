import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { novoToken, hashToken, hashIp, ipDaRequisicao, limpar, emailValido, validarArquivos, salvarAnexos, passouLimite } from '@/lib/chamados';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Abertura PÚBLICA de chamado (sem login): locatário ou locador pelo link/QR da imobiliária.
export async function POST(req) {
  let fd;
  try { fd = await req.formData(); } catch (e) { return NextResponse.json({ error: 'Envio inválido.' }, { status: 400 }); }
  if (limpar(fd.get('website'), 50)) return NextResponse.json({ ok: true }); // campo-isca: robô preencheu, finge que deu certo

  const slug = limpar(fd.get('slug'), 80).toLowerCase();
  const tipo = fd.get('tipo') === 'locador' ? 'locador' : 'locatario';
  const nome = limpar(fd.get('nome'), 120);
  const email = limpar(fd.get('email'), 200).toLowerCase();
  const telefone = limpar(fd.get('telefone'), 30);
  const endereco = limpar(fd.get('endereco'), 250);
  const titulo = limpar(fd.get('titulo'), 120);
  const descricao = limpar(fd.get('descricao'), 3000);
  const files = fd.getAll('arquivos').filter((f) => f && typeof f === 'object' && f.size > 0);

  if (!slug || !nome || !endereco || !titulo || !descricao) return NextResponse.json({ error: 'Preencha nome, endereço, assunto e descrição.' }, { status: 400 });
  if (!email && !telefone) return NextResponse.json({ error: 'Informe um e-mail ou um telefone para contato.' }, { status: 400 });
  if (email && !emailValido(email)) return NextResponse.json({ error: 'O e-mail informado não parece válido.' }, { status: 400 });
  const erroArq = validarArquivos(files);
  if (erroArq) return NextResponse.json({ error: erroArq }, { status: 400 });

  const admin = createAdminClient();
  const { data: cli } = await admin.from('clientes').select('id, nome_empresa, chamados_ativo').eq('slug_chamados', slug).maybeSingle();
  if (!cli || cli.chamados_ativo === false) return NextResponse.json({ error: 'Este endereço de chamados não está disponível.' }, { status: 404 });

  const ipHash = hashIp(ipDaRequisicao(req));
  if (await passouLimite(admin, { ipHash, clienteId: cli.id })) return NextResponse.json({ error: 'Muitos chamados em pouco tempo. Tente novamente mais tarde.' }, { status: 429 });

  const token = novoToken();
  const { data: ch, error } = await admin.from('chamados').insert({
    cliente_id: cli.id, solicitante_tipo: tipo, solicitante_nome: nome, solicitante_email: email || null, solicitante_telefone: telefone || null,
    endereco, titulo, descricao, token_hash: hashToken(token), ip_hash: ipHash,
  }).select('id, numero').single();
  if (error || !ch) return NextResponse.json({ error: 'Não foi possível abrir o chamado agora. Tente de novo.' }, { status: 500 });

  if (files.length) await salvarAnexos(admin, ch.id, files, { tipo: 'externo', nome });
  try {
    await admin.from('auditoria').insert({ acao: 'Chamado aberto pelo link externo', detalhe: `${ch.numero} · ${cli.nome_empresa} · ${tipo}`, alvo_tipo: 'chamado', alvo_id: ch.id, autor_nome: nome, autor_role: 'externo' });
  } catch (e) {}
  return NextResponse.json({ ok: true, numero: ch.numero, token });
}

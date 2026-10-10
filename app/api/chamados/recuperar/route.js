import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { hashIp, ipDaRequisicao, limpar, emailValido, digitosTelefone, linkDoChamado } from '@/lib/chamados';
import { enviarEmailChamado } from '@/lib/email';

export const runtime = 'nodejs';

// "Perdi meu link": a pessoa informa o e-mail ou telefone usados na abertura.
// A resposta é SEMPRE a mesma (acha ou não), e o link só vai para o e-mail que já estava cadastrado no chamado.
const RESPOSTA = { ok: true, mensagem: 'Se encontrarmos chamados com esse contato, enviaremos o link para o e-mail cadastrado nele. Confira também o spam. Se não receber, peça um novo link à sua imobiliária.' };

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  if (limpar(body.website, 20)) return NextResponse.json(RESPOSTA);
  const contato = limpar(body.contato, 200).toLowerCase();
  if (!contato) return NextResponse.json({ error: 'Informe o e-mail ou telefone usados no chamado.' }, { status: 400 });

  const admin = createAdminClient();
  const ip = hashIp(ipDaRequisicao(req));
  const desde = new Date(Date.now() - 3600 * 1000).toISOString();
  const { count } = await admin.from('chamado_recuperacoes').select('id', { count: 'exact', head: true }).eq('ip_hash', ip).gte('criado_em', desde);
  if ((count || 0) >= 5) return NextResponse.json({ error: 'Muitas tentativas. Tente novamente mais tarde.' }, { status: 429 });
  await admin.from('chamado_recuperacoes').insert({ ip_hash: ip });

  const porEmail = emailValido(contato);
  const dig = digitosTelefone(contato);
  if (!porEmail && dig.length < 8) return NextResponse.json({ error: 'Informe um e-mail ou telefone válido.' }, { status: 400 });

  let q = admin.from('chamados').select('*, clientes(nome_empresa)').not('solicitante_email', 'is', null).neq('status', 'cancelado').order('criado_em', { ascending: false }).limit(5);
  q = porEmail ? q.eq('solicitante_email', contato) : q.eq('telefone_digitos', dig);
  const { data: lista } = await q;

  // um e-mail por endereço cadastrado, com todos os chamados dele
  const porDestino = {};
  for (const ch of lista || []) (porDestino[ch.solicitante_email] ||= []).push(ch);
  for (const [email, chs] of Object.entries(porDestino)) {
    const itens = [];
    for (const ch of chs) itens.push(`<li><strong>${ch.numero}</strong> — ${String(ch.titulo).replace(/</g, '&lt;')}: <a href="${await linkDoChamado(admin, ch)}">abrir</a></li>`);
    await enviarEmailChamado({
      para: email, assunto: 'Seus chamados — link de acompanhamento', titulo: 'Seu link de acompanhamento',
      corpoHtml: `<p>Você pediu o link dos seus chamados:</p><ul>${itens.join('')}</ul><p>Se não foi você, ignore este e-mail.</p>`,
      link: await linkDoChamado(admin, chs[0]), imobiliaria: chs[0].clientes?.nome_empresa,
    });
  }
  return NextResponse.json(RESPOSTA);
}

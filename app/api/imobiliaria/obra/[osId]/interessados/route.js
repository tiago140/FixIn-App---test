import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { createAdminClient } from '@/lib/supabase/admin';
import { enviarEmailAvisoImobiliaria } from '@/lib/email';
import { urlSite, limpar, emailValido, digitosTelefone } from '@/lib/chamados';

export const runtime = 'nodejs';
const erro = (m, s = 400) => NextResponse.json({ error: m }, { status: s });
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// A imobiliária (ou a equipe FixIn) inclui quem vai acompanhar a obra. A ordem precisa ser de um orçamento que a pessoa enxerga.
async function autorizar(osId) {
  const { user, profile, supabase } = await getProfile();
  if (!user || !profile) return { falha: erro('Faça login novamente.', 401) };
  if (profile.role !== 'master' && profile.role !== 'imobiliaria') return { falha: erro('sem permissão', 403) };
  const admin = createAdminClient();
  const { data: os } = await admin.from('ordens_servico').select('id, numero, endereco, orcamento_id, token_acompanhamento, acompanhamento_ativo').eq('id', osId).maybeSingle();
  if (!os) return { falha: erro('Obra não encontrada.', 404) };
  if (profile.role === 'imobiliaria') {
    if (!os.orcamento_id) return { falha: erro('sem permissão', 403) };
    const { data: visivel } = await supabase.from('orcamentos_cliente').select('id').eq('id', os.orcamento_id).maybeSingle();
    if (!visivel) return { falha: erro('sem permissão', 403) };
  }
  return { user, profile, admin, os };
}

export async function POST(req, { params }) {
  const a = await autorizar(params.osId);
  if (a.falha) return a.falha;
  const { admin, os, profile, user } = a;
  if (!os.acompanhamento_ativo || !os.token_acompanhamento) return erro('O link ainda não foi ativado: ele liga sozinho quando o prestador enviar a primeira foto de início.', 409);
  const b = await req.json().catch(() => ({}));
  const nome = limpar(b.nome, 120);
  const email = limpar(b.email, 200).toLowerCase();
  const dig = digitosTelefone(b.whatsapp);
  if (!nome) return erro('Informe o nome do interessado.');
  if (!email && dig.length < 10) return erro('Informe o WhatsApp ou o e-mail.');
  if (email && !emailValido(email)) return erro('E-mail inválido.');
  const { count } = await admin.from('os_interessados').select('id', { count: 'exact', head: true }).eq('os_id', os.id);
  if ((count || 0) >= 10) return erro('Limite de 10 interessados por obra.', 409);

  const link = `${urlSite()}/acompanhar/${os.token_acompanhamento}`;
  const whatsapp = dig.length >= 10 ? (dig.length <= 11 ? `55${dig}` : dig) : null;
  const { data, error } = await admin.from('os_interessados').insert({ os_id: os.id, nome, email: email || null, whatsapp, criado_por: user.id, criado_por_nome: profile.nome_completo || null }).select('id').single();
  if (error) return erro('Não foi possível salvar agora.', 500);

  let emailEnviado = false;
  if (email) {
    try {
      const r = await enviarEmailAvisoImobiliaria({ para: [email], assunto: `Acompanhe a obra — ${os.endereco}`, titulo: 'Acompanhe a obra', corpoHtml: `<p>Olá, ${esc(nome)}.</p><p>A obra do imóvel <strong>${esc(os.endereco)}</strong> foi iniciada. Pelo link abaixo você acompanha as fotos do início, da execução e do final, sem precisar de senha.</p>`, link, textoBotao: 'Acompanhar a obra' });
      emailEnviado = !!r?.enviado || r?.ok === true;
      if (emailEnviado) await admin.from('os_interessados').update({ avisado_em: new Date().toISOString() }).eq('id', data.id);
    } catch (e) {}
  }
  try { await admin.from('auditoria').insert({ acao: 'Incluiu interessado no acompanhamento da obra', detalhe: `${os.numero} · ${nome}`, alvo_tipo: 'ordem_servico', alvo_id: os.id, autor_id: user.id, autor_nome: profile.nome_completo, autor_role: profile.role }); } catch (e) {}
  const texto = encodeURIComponent(`Olá, ${nome}! Acompanhe a obra do imóvel ${os.endereco} por este link: ${link}`);
  return NextResponse.json({ ok: true, id: data.id, emailEnviado, whatsappUrl: whatsapp ? `https://wa.me/${whatsapp}?text=${texto}` : null });
}

export async function DELETE(req, { params }) {
  const a = await autorizar(params.osId);
  if (a.falha) return a.falha;
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return erro('Informe o interessado.');
  await a.admin.from('os_interessados').delete().eq('id', id).eq('os_id', a.os.id);
  return NextResponse.json({ ok: true });
}

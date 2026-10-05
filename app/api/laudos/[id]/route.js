import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { createAdminClient } from '@/lib/supabase/admin';
import { BUCKET, dataValida, aplicarListaFotos, montarEGravarPdf } from '@/lib/laudos';
import { enviarEmailLaudoPublicado } from '@/lib/email';
import { destinatariosDoCliente } from '@/lib/destinatarios';

export const runtime = 'nodejs';
export const maxDuration = 60;

const erro = (m, s = 400) => NextResponse.json({ error: m }, { status: s });

async function registrar(ctx, acao, detalhe) {
  try {
    await ctx.supabase.from('auditoria').insert({ acao, detalhe, alvo_tipo: 'laudo', alvo_id: ctx.laudo.id, autor_id: ctx.user.id, autor_nome: ctx.profile.nome_completo, autor_role: ctx.profile.role });
  } catch (e) {}
}

async function carregar(params) {
  const { user, profile, supabase } = await getProfile();
  if (!user || profile?.role !== 'master') return { falha: erro('sem permissão', 403) };
  const { data: laudo } = await supabase.from('laudos').select('*').eq('id', params.id).maybeSingle();
  if (!laudo) return { falha: erro('laudo não encontrado', 404) };
  return { user, profile, supabase, laudo, admin: createAdminClient() };
}

// Editar o laudo, publicar e despublicar: SÓ a equipe FixIn.
export async function PATCH(req, { params }) {
  const ctx = await carregar(params);
  if (ctx.falha) return ctx.falha;
  const { supabase, laudo, admin } = ctx;
  let b = {};
  try { b = await req.json(); } catch (e) {}

  if (b.acao === 'publicar') {
    const texto = String(laudo.texto_tecnico || '').trim() || String(laudo.descricao_original || '').trim();
    if (!texto) return erro('Escreva o texto do laudo antes de publicar.');
    // o PDF que a imobiliária vê é sempre gerado agora, a partir do que está salvo
    let gerado;
    try { gerado = await montarEGravarPdf(admin, laudo.id); } catch (e) { return erro('Não consegui gerar o PDF: ' + e.message, 500); }
    const { error } = await supabase.from('laudos').update({ publicado: true, publicado_em: new Date().toISOString(), atualizado_em: new Date().toISOString() }).eq('id', laudo.id);
    if (error) return erro(error.message);
    let email = null;
    if (b.avisar_email) {
      const dest = await destinatariosDoCliente(supabase, laudo.cliente_id, { orcamentoId: laudo.orcamento_id });
      email = await enviarEmailLaudoPublicado({ paraEmail: dest.emails, nomeImobiliaria: gerado.cliente?.nome_empresa, numero: laudo.numero, endereco: laudo.endereco, pdfBuffer: gerado.pdf });
    }
    await registrar(ctx, 'Publicou laudo de inspeção', `${laudo.numero}${email ? (email.enviado ? ` — e-mail enviado para ${email.para.join(', ')}` : ` — e-mail NÃO enviado (${email.motivo})`) : ''}`);
    return NextResponse.json({ ok: true, email });
  }

  if (b.acao === 'despublicar') {
    const { error } = await supabase.from('laudos').update({ publicado: false, atualizado_em: new Date().toISOString() }).eq('id', laudo.id);
    if (error) return erro(error.message);
    await registrar(ctx, 'Despublicou laudo de inspeção', laudo.numero);
    return NextResponse.json({ ok: true });
  }

  const upd = {};
  if ('endereco' in b) {
    const v = String(b.endereco || '').trim().slice(0, 200);
    if (!v) return erro('Informe o endereço do imóvel.');
    upd.endereco = v;
  }
  if ('titulo' in b) upd.titulo = String(b.titulo || '').trim().slice(0, 120) || 'Laudo de Inspeção';
  if ('data_inspecao' in b) {
    if (!dataValida(b.data_inspecao)) return erro('Data da inspeção inválida.');
    upd.data_inspecao = b.data_inspecao;
  }
  if ('orcamento_id' in b) {
    if (b.orcamento_id) {
      const { data: o } = await supabase.from('orcamentos').select('id, cliente_id').eq('id', b.orcamento_id).maybeSingle();
      if (!o || o.cliente_id !== laudo.cliente_id) return erro('O orçamento escolhido não é desta imobiliária.');
      upd.orcamento_id = o.id;
    } else {
      upd.orcamento_id = null;
    }
  }
  if ('descricao_original' in b) upd.descricao_original = String(b.descricao_original ?? '').slice(0, 20000);
  if ('texto_tecnico' in b) upd.texto_tecnico = String(b.texto_tecnico ?? '').slice(0, 30000);
  if ('fotos' in b) {
    const r = aplicarListaFotos(laudo.fotos, b.fotos);
    if (r.erro) return erro(r.erro, 409);
    upd.fotos = r.fotos;
  }
  if (Object.keys(upd).length === 0) return erro('nada para salvar');
  upd.atualizado_em = new Date().toISOString();

  const { error } = await supabase.from('laudos').update(upd).eq('id', laudo.id);
  if (error) return erro(error.message);

  // laudo já publicado: o PDF da imobiliária acompanha a edição
  let aviso = null;
  if (laudo.publicado) {
    try { await montarEGravarPdf(admin, laudo.id); } catch (e) { aviso = 'Salvo, mas não consegui atualizar o PDF publicado: ' + e.message; }
  }
  return NextResponse.json({ ok: true, aviso });
}

// Excluir de vez (com as fotos e o PDF): SÓ a equipe FixIn.
export async function DELETE(req, { params }) {
  const ctx = await carregar(params);
  if (ctx.falha) return ctx.falha;
  const { supabase, laudo, admin } = ctx;
  const caminhos = [...(laudo.fotos || []).map((f) => f.path), laudo.pdf_path].filter(Boolean);
  const { error } = await supabase.from('laudos').delete().eq('id', laudo.id);
  if (error) return erro(error.message);
  let restantes = 0;
  if (caminhos.length) {
    const { error: e2 } = await admin.storage.from(BUCKET).remove(caminhos);
    if (e2) restantes = caminhos.length;
  }
  await registrar(ctx, 'Excluiu laudo de inspeção', `${laudo.numero} — ${laudo.endereco}`);
  return NextResponse.json({ ok: true, arquivosRestantes: restantes });
}

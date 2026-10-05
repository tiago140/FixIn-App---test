import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { createAdminClient } from '@/lib/supabase/admin';
import { validarSenha } from '@/lib/senha';

const BAN_LONGO = '876000h'; // ~100 anos: bloqueia o login no Supabase Auth
const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const erro = (mensagem, status = 400) => NextResponse.json({ error: mensagem }, { status });

async function registrar(ctx, texto, detalhe) {
  try {
    await ctx.supabase.from('auditoria').insert({
      acao: texto,
      detalhe: detalhe || `${ctx.alvo.nome_completo} (${ctx.alvo.email})`,
      alvo_tipo: 'usuario',
      alvo_id: ctx.alvo.id,
      autor_id: ctx.user.id,
      autor_nome: ctx.profile.nome_completo,
      autor_role: ctx.profile.role,
    });
  } catch (e) {}
}

// Só equipe FixIn (master) chega aqui. Usuários master (funcionários e o dono) só o dono gerencia.
async function autorizar(params) {
  const { user, profile, supabase } = await getProfile();
  if (!user || profile?.role !== 'master') return { falha: erro('sem permissão', 403) };
  const admin = createAdminClient();
  const { data: alvo } = await admin.from('profiles').select('*').eq('id', params.id).maybeSingle();
  if (!alvo) return { falha: erro('usuário não encontrado', 404) };
  if (alvo.role === 'master' && !profile.dono) return { falha: erro('Só o dono pode gerenciar usuários master.', 403) };
  return { user, profile, supabase, admin, alvo };
}

// Ações sobre um usuário existente: editar cadastro, desativar, reativar, redefinir a senha.
export async function PATCH(req, { params }) {
  const ctx = await autorizar(params);
  if (ctx.falha) return ctx.falha;
  const { user, admin, alvo } = ctx;

  let corpo = {};
  try { corpo = await req.json(); } catch (e) {}
  const { acao, senha } = corpo;

  if (acao === 'editar') {
    const nome = String(corpo.nome_completo || '').trim();
    const email = String(corpo.email || '').trim().toLowerCase();
    const cpfBruto = String(corpo.cpf || '').trim();
    if (!nome) return erro('Informe o nome.');
    if (!EMAIL_OK.test(email)) return erro('Informe um e-mail válido.');
    if (cpfBruto && cpfBruto.replace(/\D/g, '').length !== 11) return erro('O CPF precisa ter 11 números.');

    const atualizacao = { nome_completo: nome, email, cpf: cpfBruto || null };
    // o perfil (administrador/operacional) só existe para usuários de imobiliária; a conta do dono e os masters não mudam de papel
    if (alvo.role === 'imobiliaria') atualizacao.subrole = corpo.subrole === 'admin' ? 'admin' : 'operacional';

    const emailMudou = email !== String(alvo.email || '').toLowerCase();
    if (emailMudou) {
      const { error: e1 } = await admin.auth.admin.updateUserById(alvo.id, { email, email_confirm: true });
      if (e1) return erro(/already|registered|exists/i.test(e1.message) ? 'Já existe um usuário com esse e-mail.' : e1.message);
    }
    const { error: e2 } = await admin.from('profiles').update(atualizacao).eq('id', alvo.id);
    if (e2) {
      if (emailMudou) await admin.auth.admin.updateUserById(alvo.id, { email: alvo.email, email_confirm: true });
      return erro(e2.message);
    }
    const mudancas = [
      nome !== alvo.nome_completo && 'nome',
      emailMudou && 'e-mail',
      (cpfBruto || null) !== (alvo.cpf || null) && 'CPF',
      atualizacao.subrole && atualizacao.subrole !== (alvo.subrole || 'admin') && `perfil → ${atualizacao.subrole === 'admin' ? 'Administrador' : 'Operacional'}`,
    ].filter(Boolean);
    await registrar(ctx, 'Editou usuário', `${alvo.nome_completo} (${alvo.email})${mudancas.length ? ' — alterou: ' + mudancas.join(', ') : ''}`);
    return NextResponse.json({ ok: true });
  }

  if (acao === 'desativar') {
    if (alvo.id === user.id) return erro('Você não pode desativar o seu próprio acesso.');
    if (alvo.dono) return erro('A conta do dono não pode ser desativada.', 403);

    // 1) bloqueia no sistema (efeito imediato)  2) bloqueia o login no Supabase Auth
    const { error: e1 } = await admin.from('profiles').update({ ativo: false }).eq('id', alvo.id);
    if (e1) return erro(e1.message);
    const { error: e2 } = await admin.auth.admin.updateUserById(alvo.id, { ban_duration: BAN_LONGO });
    if (e2) return erro('Acesso bloqueado no sistema, mas o bloqueio de login falhou: ' + e2.message, 500);
    await registrar(ctx, 'Desativou usuário');
    return NextResponse.json({ ok: true });
  }

  if (acao === 'reativar') {
    const { error: e1 } = await admin.auth.admin.updateUserById(alvo.id, { ban_duration: 'none' });
    if (e1) return erro(e1.message);
    const { error: e2 } = await admin.from('profiles').update({ ativo: true }).eq('id', alvo.id);
    if (e2) return erro(e2.message);
    await registrar(ctx, 'Reativou usuário');
    return NextResponse.json({ ok: true });
  }

  if (acao === 'redefinir_senha') {
    if (alvo.dono) return erro('A senha do dono é trocada em "Minha conta".', 403);
    const erroSenha = validarSenha(senha);
    if (erroSenha) return erro(erroSenha);
    const { error } = await admin.auth.admin.updateUserById(alvo.id, { password: senha });
    if (error) return erro(error.message);
    await registrar(ctx, 'Redefiniu a senha de usuário');
    return NextResponse.json({ ok: true });
  }

  return erro('ação inválida');
}

// Excluir de vez: só quem nunca usou o sistema. Quem já tem histórico (orçamentos, mensagens, Auditoria...)
// só pode ser desativado, para não apagar o registro de quem fez o quê.
export async function DELETE(req, { params }) {
  const ctx = await autorizar(params);
  if (ctx.falha) return ctx.falha;
  const { user, admin, alvo } = ctx;

  if (alvo.dono) return erro('A conta do dono não pode ser excluída.', 403);
  if (alvo.id === user.id) return erro('Você não pode excluir o seu próprio acesso.');

  const { data: comHistorico } = await admin.rpc('pessoas_com_historico', { p_ids: [alvo.id] });
  if ((comHistorico || []).length > 0) {
    return erro('Esta pessoa já tem histórico no sistema (orçamentos, mensagens, Auditoria…). Para não perder o registro de quem fez o quê, desative o acesso em vez de excluir.', 409);
  }

  const { error } = await admin.auth.admin.deleteUser(alvo.id);
  if (error) {
    return erro(/database/i.test(error.message) ? 'Não foi possível excluir: a pessoa tem registros no sistema. Desative o acesso em vez de excluir.' : error.message, 409);
  }
  await registrar(ctx, 'Excluiu usuário');
  return NextResponse.json({ ok: true });
}

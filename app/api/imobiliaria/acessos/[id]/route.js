import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { createAdminClient } from '@/lib/supabase/admin';
import { validarSenha } from '@/lib/senha';

const BAN_LONGO = '876000h'; // ~100 anos: bloqueia o login no Supabase Auth
const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const erro = (mensagem, status = 400) => NextResponse.json({ error: mensagem }, { status });
const ehAdmin = (p) => p.subrole == null || p.subrole === 'admin'; // mesma regra do banco (is_imobiliaria_admin)

// Verifica no BANCO que quem pede é administrador ativo da própria imobiliária e carrega a pessoa-alvo.
// Só mexe em gente da MESMA imobiliária; master e prestador nunca passam por aqui.
async function autorizar(params) {
  const { user, profile, supabase } = await getProfile();
  if (!user || profile?.role !== 'imobiliaria') return { falha: erro('sem permissão', 403) };

  const { data: clienteId, error: erroPermissao } = await supabase.rpc('pode_criar_acesso_imobiliaria');
  if (erroPermissao || !clienteId) return { falha: erro('Só o administrador da imobiliária pode gerenciar a equipe.', 403) };

  const admin = createAdminClient();
  const { data: alvo } = await admin.from('profiles').select('*').eq('id', params.id).maybeSingle();
  if (!alvo || alvo.role !== 'imobiliaria' || alvo.cliente_id !== clienteId) {
    return { falha: erro('usuário não encontrado', 404) };
  }
  return { user, profile, admin, alvo, clienteId };
}

async function outrosAdminsAtivos(admin, clienteId, alvoId) {
  const { data } = await admin.from('profiles').select('id, subrole, ativo').eq('cliente_id', clienteId).eq('role', 'imobiliaria');
  return (data || []).filter((p) => p.id !== alvoId && p.ativo !== false && ehAdmin(p)).length;
}

async function registrar(ctx, texto, detalhe) {
  try {
    await ctx.admin.from('auditoria').insert({
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

// Editar cadastro, trocar senha, desativar e reativar.
export async function PATCH(req, { params }) {
  const ctx = await autorizar(params);
  if (ctx.falha) return ctx.falha;
  const { admin, alvo, clienteId, user } = ctx;
  const eu = alvo.id === user.id;

  let corpo = {};
  try { corpo = await req.json(); } catch (e) {}
  const { acao } = corpo;

  if (acao === 'editar') {
    const nome = String(corpo.nome_completo || '').trim();
    const email = String(corpo.email || '').trim().toLowerCase();
    const cpfBruto = String(corpo.cpf || '').trim();
    const novoPerfil = corpo.subrole === 'admin' ? 'admin' : 'operacional';
    if (!nome) return erro('Informe o nome.');
    if (!EMAIL_OK.test(email)) return erro('Informe um e-mail válido.');
    if (cpfBruto && cpfBruto.replace(/\D/g, '').length !== 11) return erro('O CPF precisa ter 11 números.');

    const perfilAtual = ehAdmin(alvo) ? 'admin' : 'operacional';
    if (novoPerfil !== perfilAtual) {
      if (eu) return erro('Você não pode mudar o seu próprio perfil. Peça a outro administrador.', 403);
      if (perfilAtual === 'admin' && (await outrosAdminsAtivos(admin, clienteId, alvo.id)) === 0) {
        return erro('A imobiliária precisa ter pelo menos um administrador ativo.', 400);
      }
    }

    // e-mail = login: troca primeiro no sistema de login; se o cadastro falhar, desfaz.
    const emailMudou = email !== String(alvo.email || '').toLowerCase();
    if (emailMudou) {
      const { error: e1 } = await admin.auth.admin.updateUserById(alvo.id, { email, email_confirm: true });
      if (e1) return erro(/already|registered|exists/i.test(e1.message) ? 'Já existe um usuário com esse e-mail.' : e1.message);
    }
    const { error: e2 } = await admin.from('profiles').update({ nome_completo: nome, email, cpf: cpfBruto || null, subrole: novoPerfil }).eq('id', alvo.id);
    if (e2) {
      if (emailMudou) await admin.auth.admin.updateUserById(alvo.id, { email: alvo.email, email_confirm: true });
      return erro(e2.message);
    }
    const mudancas = [
      nome !== alvo.nome_completo && 'nome',
      emailMudou && 'e-mail',
      (cpfBruto || null) !== (alvo.cpf || null) && 'CPF',
      novoPerfil !== perfilAtual && `perfil → ${novoPerfil === 'admin' ? 'Administrador' : 'Operacional'}`,
    ].filter(Boolean);
    await registrar(ctx, 'Editou usuário da equipe', `${alvo.nome_completo} (${alvo.email})${mudancas.length ? ' — alterou: ' + mudancas.join(', ') : ''}`);
    return NextResponse.json({ ok: true });
  }

  if (acao === 'redefinir_senha') {
    if (eu) return erro('A sua senha é trocada em "Minha conta".', 400);
    const erroSenha = validarSenha(corpo.senha);
    if (erroSenha) return erro(erroSenha);
    const { error } = await admin.auth.admin.updateUserById(alvo.id, { password: corpo.senha });
    if (error) return erro(error.message);
    await registrar(ctx, 'Redefiniu a senha de usuário da equipe');
    return NextResponse.json({ ok: true });
  }

  if (acao === 'desativar') {
    if (eu) return erro('Você não pode desativar o seu próprio acesso.');
    if (ehAdmin(alvo) && (await outrosAdminsAtivos(admin, clienteId, alvo.id)) === 0) {
      return erro('A imobiliária precisa ter pelo menos um administrador ativo.');
    }
    const { error: e1 } = await admin.from('profiles').update({ ativo: false }).eq('id', alvo.id);
    if (e1) return erro(e1.message);
    const { error: e2 } = await admin.auth.admin.updateUserById(alvo.id, { ban_duration: BAN_LONGO });
    if (e2) return erro('Acesso bloqueado no sistema, mas o bloqueio de login falhou: ' + e2.message, 500);
    await registrar(ctx, 'Desativou usuário da equipe');
    return NextResponse.json({ ok: true });
  }

  if (acao === 'reativar') {
    const { error: e1 } = await admin.auth.admin.updateUserById(alvo.id, { ban_duration: 'none' });
    if (e1) return erro(e1.message);
    const { error: e2 } = await admin.from('profiles').update({ ativo: true }).eq('id', alvo.id);
    if (e2) return erro(e2.message);
    await registrar(ctx, 'Reativou usuário da equipe');
    return NextResponse.json({ ok: true });
  }

  return erro('ação inválida');
}

// Excluir de vez: só para quem nunca usou o sistema. Quem já tem histórico (orçamentos, mensagens, comprovantes,
// Auditoria...) só pode ser desativado, para não apagar o registro de quem fez o quê.
export async function DELETE(req, { params }) {
  const ctx = await autorizar(params);
  if (ctx.falha) return ctx.falha;
  const { admin, alvo, clienteId, user } = ctx;

  if (alvo.id === user.id) return erro('Você não pode excluir o seu próprio acesso.');
  if (ehAdmin(alvo) && alvo.ativo !== false && (await outrosAdminsAtivos(admin, clienteId, alvo.id)) === 0) {
    return erro('A imobiliária precisa ter pelo menos um administrador ativo.');
  }

  const { data: comHistorico } = await admin.rpc('pessoas_com_historico', { p_ids: [alvo.id] });
  if ((comHistorico || []).length > 0) {
    return erro('Esta pessoa já tem histórico no sistema (orçamentos, mensagens, comprovantes…). Para não perder o registro de quem fez o quê, desative o acesso em vez de excluir.', 409);
  }

  // Apaga o login; o cadastro sai junto (ON DELETE CASCADE).
  const { error } = await admin.auth.admin.deleteUser(alvo.id);
  if (error) {
    return erro(/database/i.test(error.message) ? 'Não foi possível excluir: a pessoa tem registros no sistema. Desative o acesso em vez de excluir.' : error.message, 409);
  }
  await registrar(ctx, 'Excluiu usuário da equipe');
  return NextResponse.json({ ok: true });
}

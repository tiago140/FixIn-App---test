import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { createAdminClient } from '@/lib/supabase/admin';
import { validarSenha } from '@/lib/senha';

const BAN_LONGO = '876000h'; // ~100 anos: bloqueia o login no Supabase Auth

// Ações sobre um usuário existente: desativar, reativar, redefinir a senha.
export async function PATCH(req, { params }) {
  const { user, profile, supabase } = await getProfile();
  if (!user || profile?.role !== 'master') {
    return NextResponse.json({ error: 'sem permissão' }, { status: 403 });
  }

  const { acao, senha } = await req.json();
  const admin = createAdminClient();

  const { data: alvo } = await admin.from('profiles').select('*').eq('id', params.id).maybeSingle();
  if (!alvo) return NextResponse.json({ error: 'usuário não encontrado' }, { status: 404 });

  // usuários master (funcionários e o dono) só o dono gerencia
  if (alvo.role === 'master' && !profile.dono) {
    return NextResponse.json({ error: 'Só o dono pode gerenciar usuários master.' }, { status: 403 });
  }

  const registrar = async (texto) => {
    try {
      await supabase.from('auditoria').insert({
        acao: texto,
        detalhe: `${alvo.nome_completo} (${alvo.email})`,
        alvo_tipo: 'usuario',
        alvo_id: alvo.id,
        autor_id: user.id,
        autor_nome: profile.nome_completo,
        autor_role: profile.role,
      });
    } catch (e) {}
  };

  if (acao === 'desativar') {
    if (alvo.id === user.id) return NextResponse.json({ error: 'Você não pode desativar o seu próprio acesso.' }, { status: 400 });
    if (alvo.dono) return NextResponse.json({ error: 'A conta do dono não pode ser desativada.' }, { status: 403 });

    // 1) bloqueia no sistema (efeito imediato)  2) bloqueia o login no Supabase Auth
    const { error: e1 } = await admin.from('profiles').update({ ativo: false }).eq('id', alvo.id);
    if (e1) return NextResponse.json({ error: e1.message }, { status: 400 });
    const { error: e2 } = await admin.auth.admin.updateUserById(alvo.id, { ban_duration: BAN_LONGO });
    if (e2) return NextResponse.json({ error: 'Acesso bloqueado no sistema, mas o bloqueio de login falhou: ' + e2.message }, { status: 500 });
    await registrar('Desativou usuário');
    return NextResponse.json({ ok: true });
  }

  if (acao === 'reativar') {
    const { error: e1 } = await admin.auth.admin.updateUserById(alvo.id, { ban_duration: 'none' });
    if (e1) return NextResponse.json({ error: e1.message }, { status: 400 });
    const { error: e2 } = await admin.from('profiles').update({ ativo: true }).eq('id', alvo.id);
    if (e2) return NextResponse.json({ error: e2.message }, { status: 400 });
    await registrar('Reativou usuário');
    return NextResponse.json({ ok: true });
  }

  if (acao === 'redefinir_senha') {
    if (alvo.dono) return NextResponse.json({ error: 'A senha do dono é trocada em "Minha conta".' }, { status: 403 });
    const erroSenha = validarSenha(senha);
    if (erroSenha) return NextResponse.json({ error: erroSenha }, { status: 400 });
    const { error } = await admin.auth.admin.updateUserById(alvo.id, { password: senha });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    await registrar('Redefiniu a senha de usuário');
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'ação inválida' }, { status: 400 });
}

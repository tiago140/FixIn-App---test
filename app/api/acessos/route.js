import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { createAdminClient } from '@/lib/supabase/admin';
import { validarSenha } from '@/lib/senha';

const ROLES_PERMITIDOS = ['master', 'imobiliaria'];

export async function POST(req) {
  const { user, profile, supabase } = await getProfile();
  if (!user || profile?.role !== 'master') {
    return NextResponse.json({ error: 'sem permissão' }, { status: 403 });
  }

  const body = await req.json();
  const { senha, nome_completo, cpf, role, cliente_id, subrole } = body;
  const email = String(body.email || '').trim().toLowerCase();

  if (!email || !senha || !nome_completo || !role) {
    return NextResponse.json({ error: 'preencha e-mail, senha, nome e tipo de acesso' }, { status: 400 });
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: 'e-mail inválido' }, { status: 400 });
  }
  const erroSenha = validarSenha(senha);
  if (erroSenha) return NextResponse.json({ error: erroSenha }, { status: 400 });
  if (!ROLES_PERMITIDOS.includes(role)) {
    return NextResponse.json({ error: 'tipo de acesso inválido' }, { status: 400 });
  }
  // funcionário com acesso total (master): só o dono cria
  if (role === 'master' && !profile.dono) {
    return NextResponse.json({ error: 'Só o dono pode criar usuários master (funcionários com acesso total).' }, { status: 403 });
  }
  if (role === 'imobiliaria' && !cliente_id) {
    return NextResponse.json({ error: 'selecione a imobiliária vinculada' }, { status: 400 });
  }

  const admin = createAdminClient();

  if (role === 'imobiliaria') {
    const { data: cli } = await admin.from('clientes').select('ativo').eq('id', cliente_id).maybeSingle();
    if (!cli) return NextResponse.json({ error: 'imobiliária não encontrada' }, { status: 400 });
    if (cli.ativo === false) return NextResponse.json({ error: 'Esta imobiliária está desativada. Reative-a antes de criar usuários.' }, { status: 409 });
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
  });

  if (createError) {
    const jaExiste = /already|registered|exists/i.test(createError.message || '');
    return NextResponse.json({ error: jaExiste ? 'Já existe um usuário com esse e-mail.' : createError.message }, { status: 400 });
  }

  const { error: profileError } = await admin.from('profiles').insert({
    id: created.user.id,
    role,
    subrole: role === 'imobiliaria' ? (subrole || 'admin') : null,
    nome_completo,
    cpf: cpf || null,
    email,
    cliente_id: role === 'imobiliaria' ? cliente_id : null,
    ativo: true,
    dono: false,
  });

  if (profileError) {
    // limpa o usuário de auth se o perfil falhar, pra não ficar órfão
    await admin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  try {
    await supabase.from('auditoria').insert({
      acao: role === 'master' ? 'Criou usuário master (funcionário)' : 'Criou acesso de imobiliária',
      detalhe: `${nome_completo} (${email})`,
      alvo_tipo: 'usuario',
      alvo_id: created.user.id,
      autor_id: user.id,
      autor_nome: profile.nome_completo,
      autor_role: profile.role,
    });
  } catch (e) {}

  return NextResponse.json({ ok: true });
}

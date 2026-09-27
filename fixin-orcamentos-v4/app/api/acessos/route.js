import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req) {
  const { user, profile } = await getProfile();
  if (!user || profile?.role !== 'master') {
    return NextResponse.json({ error: 'sem permissão' }, { status: 403 });
  }

  const body = await req.json();
  const { email, senha, nome_completo, cpf, role, cliente_id, subrole } = body;

  if (!email || !senha || !nome_completo || !role) {
    return NextResponse.json({ error: 'preencha e-mail, senha, nome e tipo de acesso' }, { status: 400 });
  }
  if (role === 'imobiliaria' && !cliente_id) {
    return NextResponse.json({ error: 'selecione a imobiliária vinculada' }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
  });

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 400 });
  }

  const { error: profileError } = await admin.from('profiles').insert({
    id: created.user.id,
    role,
    subrole: role === 'imobiliaria' ? (subrole || 'admin') : null,
    nome_completo,
    cpf: cpf || null,
    email,
    cliente_id: role === 'imobiliaria' ? cliente_id : null,
  });

  if (profileError) {
    // limpa o usuário de auth se o perfil falhar, pra não ficar órfão
    await admin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

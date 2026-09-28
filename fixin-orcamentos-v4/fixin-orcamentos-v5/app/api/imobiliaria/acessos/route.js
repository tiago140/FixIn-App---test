import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req) {
  const { user, profile, supabase } = await getProfile();
  if (!user || profile?.role !== 'imobiliaria') {
    return NextResponse.json({ error: 'sem permissão' }, { status: 403 });
  }

  // valida no banco que quem está pedindo é admin da própria imobiliária,
  // e já retorna o cliente_id certo (evita confiar em algo vindo do cliente)
  const { data: clienteId, error: erroPermissao } = await supabase.rpc('pode_criar_acesso_imobiliaria');
  if (erroPermissao) {
    return NextResponse.json({ error: erroPermissao.message }, { status: 403 });
  }

  const { email, senha, nome_completo, cpf, subrole } = await req.json();
  if (!email || !senha || !nome_completo) {
    return NextResponse.json({ error: 'preencha nome, e-mail e senha' }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
  });
  if (createError) return NextResponse.json({ error: createError.message }, { status: 400 });

  const { error: profileError } = await admin.from('profiles').insert({
    id: created.user.id,
    role: 'imobiliaria',
    subrole: subrole === 'admin' ? 'admin' : 'operacional',
    nome_completo,
    cpf: cpf || null,
    email,
    cliente_id: clienteId,
  });
  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

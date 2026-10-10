import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { validarSenhaForte } from '@/lib/senha';

// A própria pessoa troca a senha. Isso também tira a exigência de "trocar no primeiro acesso".
export async function POST(req) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Faça login novamente.' }, { status: 401 });
  const { senha } = await req.json().catch(() => ({}));
  const erro = validarSenhaForte(senha);
  if (erro) return NextResponse.json({ error: erro }, { status: 400 });
  const { error } = await createAdminClient().auth.admin.updateUserById(user.id, { password: senha, app_metadata: { trocar_senha: false } });
  if (error) return NextResponse.json({ error: /different|same/i.test(error.message) ? 'A nova senha precisa ser diferente da atual.' : 'Não foi possível trocar a senha.' }, { status: 400 });
  return NextResponse.json({ ok: true });
}

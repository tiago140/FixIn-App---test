import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { createAdminClient } from '@/lib/supabase/admin';
import { liberarAcessoPrestador } from '@/lib/acessoPrestador';

export const dynamic = 'force-dynamic';

// Dispara (ou reenvia) o e-mail de acesso: cria o login se faltar; se já existe, gera nova senha provisória.
export async function POST(_req, { params }) {
  const { user, profile } = await getProfile();
  if (!user || profile?.role !== 'master') return NextResponse.json({ error: 'sem permissão' }, { status: 403 });
  const admin = createAdminClient();
  const { data: p } = await admin.from('prestadores').select('id, nome, email, cpf, ativo').eq('id', params.id).maybeSingle();
  if (!p) return NextResponse.json({ error: 'prestador não encontrado' }, { status: 404 });
  if (p.ativo === false) return NextResponse.json({ error: 'Este prestador está inativo. Reative-o antes.' }, { status: 409 });
  const r = await liberarAcessoPrestador(admin, p);
  try { await admin.from('auditoria').insert({ acao: 'Enviou acesso ao prestador por e-mail', detalhe: p.nome, alvo_tipo: 'prestador', alvo_id: p.id, autor_id: user.id, autor_nome: profile.nome_completo, autor_role: profile.role }); } catch (e) {}
  return NextResponse.json({ ok: true, ...r });
}

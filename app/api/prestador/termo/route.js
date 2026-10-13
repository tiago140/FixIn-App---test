import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { createAdminClient } from '@/lib/supabase/admin';
import { TERMO_VERSAO, termoHash } from '@/lib/termoPrestador';

// O prestador aceita o termo (uma vez por versão). Guarda quem, quando, de onde e qual texto.
export async function POST(req) {
  const { user, profile } = await getProfile();
  if (!user || profile?.role !== 'prestador' || !profile.prestador_id) return NextResponse.json({ error: 'sem permissão' }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  const nome = String(b.nome || '').trim().replace(/\s+/g, ' ');
  if (b.aceito !== true) return NextResponse.json({ error: 'Marque que leu e concorda com o termo.' }, { status: 400 });
  const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  if (nome.length < 5 || norm(nome) !== norm(String(profile.nome_completo || '').trim().replace(/\s+/g, ' '))) {
    return NextResponse.json({ error: 'Digite seu nome completo exatamente como no cadastro para assinar.' }, { status: 400 });
  }
  const admin = createAdminClient();
  const { data: p } = await admin.from('prestadores').select('cpf, cnpj').eq('id', profile.prestador_id).maybeSingle();
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || null;
  const { error } = await admin.from('termos_aceites').upsert({
    prestador_id: profile.prestador_id, user_id: user.id, versao: TERMO_VERSAO, nome_assinante: nome,
    documento: p?.cnpj || p?.cpf || null, texto_hash: termoHash(), ip, user_agent: (req.headers.get('user-agent') || '').slice(0, 300),
  }, { onConflict: 'prestador_id,versao', ignoreDuplicates: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  try { await admin.from('auditoria').insert({ acao: 'Prestador assinou o termo de garantia', detalhe: `${nome} · versão ${TERMO_VERSAO}`, alvo_tipo: 'prestador', alvo_id: profile.prestador_id, autor_id: user.id, autor_nome: nome, autor_role: 'prestador' }); } catch (e) {}
  return NextResponse.json({ ok: true });
}

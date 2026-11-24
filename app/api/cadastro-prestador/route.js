import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { limparCadastro } from '@/lib/prestadores';

export const dynamic = 'force-dynamic';

const dig = (s) => String(s ?? '').replace(/\D/g, '');

// Cadastro externo de prestador: público, cai numa fila e só vira prestador depois que a equipe aprova.
export async function POST(req) {
  const b = await req.json().catch(() => ({}));
  if (b.site) return NextResponse.json({ ok: true }); // campo-isca: robô preenche, pessoa não vê
  const d = limparCadastro(b);
  const obs = String(b.experiencia ?? '').trim().slice(0, 600) || null;

  const pj = d.tipo_pessoa === 'pj';
  if (!d.nome || d.nome.length < 3) return NextResponse.json({ error: 'Informe seu nome completo.' }, { status: 400 });
  if (pj ? dig(d.cnpj).length !== 14 : dig(d.cpf).length !== 11) return NextResponse.json({ error: pj ? 'CNPJ inválido (14 números).' : 'CPF inválido (11 números).' }, { status: 400 });
  if (pj && !d.razao_social) return NextResponse.json({ error: 'Informe a razão social.' }, { status: 400 });
  if (dig(d.telefone).length < 10) return NextResponse.json({ error: 'Informe um telefone com DDD.' }, { status: 400 });
  if (!d.email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email)) return NextResponse.json({ error: 'Informe um e-mail válido.' }, { status: 400 });
  if (!d.cidade) return NextResponse.json({ error: 'Informe a cidade ou região em que atende.' }, { status: 400 });
  if (!d.areas.length) return NextResponse.json({ error: 'Escolha pelo menos uma área de atuação.' }, { status: 400 });
  if (!d.pix_chave || !d.pix_tipo) return NextResponse.json({ error: 'Informe a chave Pix para receber os pagamentos.' }, { status: 400 });
  if (b.aceite !== true) return NextResponse.json({ error: 'Confirme que as informações são verdadeiras.' }, { status: 400 });

  const ip = String(req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'sem-ip';
  const ipHash = createHash('sha256').update(ip + (process.env.CRON_SECRET || 'fixin')).digest('hex').slice(0, 32);
  const admin = createAdminClient();

  const { count } = await admin.from('prestadores_cadastros').select('id', { count: 'exact', head: true }).eq('ip_hash', ipHash).gte('criado_em', new Date(Date.now() - 3600000).toISOString());
  if ((count || 0) >= 5) return NextResponse.json({ error: 'Muitas tentativas. Tente de novo mais tarde.' }, { status: 429 });

  // já existe cadastro pendente ou prestador com o mesmo documento/e-mail? não duplica
  const doc = dig(pj ? d.cnpj : d.cpf);
  const { data: pend } = await admin.from('prestadores_cadastros').select('id').eq('status', 'pendente').or(`dados->>doc.eq.${doc},dados->>email.eq.${d.email}`).limit(1);
  if (pend?.length) return NextResponse.json({ ok: true, repetido: true });
  const { data: jaPrest } = await admin.from('prestadores').select('id').eq('email', d.email).limit(1);
  if (jaPrest?.length) return NextResponse.json({ error: 'Este e-mail já tem cadastro. Fale com a FixIn.' }, { status: 409 });

  const { error } = await admin.from('prestadores_cadastros').insert({ dados: { ...d, doc, experiencia: obs }, ip_hash: ipHash });
  if (error) return NextResponse.json({ error: 'Não foi possível enviar agora. Tente de novo.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}

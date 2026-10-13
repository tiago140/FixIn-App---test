import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// Consulta pública: endereço + código do orçamento → leva à linha do tempo da obra.
// Só abre ordens com o acompanhamento ligado pela equipe; resposta igual para qualquer falha.
const tentativas = new Map();
function limitado(ip) {
  const agora = Date.now();
  const lista = (tentativas.get(ip) || []).filter((t) => agora - t < 10 * 60 * 1000);
  lista.push(agora);
  tentativas.set(ip, lista);
  if (tentativas.size > 5000) tentativas.clear();
  return lista.length > 10;
}
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
function codigo(s) {
  const m = String(s || '').toUpperCase().match(/(\d{1,6})/);
  return m ? `ORC-${m[1].padStart(4, '0')}` : null;
}
function enderecoConfere(digitado, real) {
  const a = norm(digitado); const b = ` ${norm(real)} `;
  if (a.length < 8) return false;
  const partes = a.split(' ').filter(Boolean);
  if (partes.length < 2 || !partes.some((p) => /\d/.test(p))) return false;
  return partes.every((p) => b.includes(` ${p}`));
}

export async function POST(req) {
  const ip = (req.headers.get('x-forwarded-for') || 'x').split(',')[0].trim();
  if (limitado(ip)) return NextResponse.json({ erro: 'Muitas tentativas. Aguarde alguns minutos.' }, { status: 429 });
  let corpo = {};
  try { corpo = await req.json(); } catch (e) {}
  const cod = codigo(corpo.codigo);
  const naoAchou = NextResponse.json({ erro: 'Não encontramos uma obra com esses dados. Confira o endereço e o código do orçamento ou fale com a FixIn.' }, { status: 404 });
  if (!cod || !corpo.endereco) return naoAchou;
  const admin = createAdminClient();
  const { data: orc } = await admin.from('orcamentos').select('id, endereco').eq('numero', cod).maybeSingle();
  if (!orc) return naoAchou;
  const { data: ordens } = await admin.from('ordens_servico').select('id, endereco, token_acompanhamento, acompanhamento_ativo, status, criado_em').eq('orcamento_id', orc.id).eq('acompanhamento_ativo', true).not('status', 'in', '(cancelada,recusada)').order('criado_em', { ascending: false });
  const achada = (ordens || []).find((o) => o.token_acompanhamento && (enderecoConfere(corpo.endereco, o.endereco) || enderecoConfere(corpo.endereco, orc.endereco)));
  if (!achada) return naoAchou;
  return NextResponse.json({ token: achada.token_acompanhamento });
}

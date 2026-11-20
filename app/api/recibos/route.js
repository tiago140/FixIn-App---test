import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { gerarPdfRecibo } from '@/lib/gerarPdfRecibo';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
const lim = (v, n) => String(v ?? '').trim().slice(0, n);

// Gera o PDF do recibo (só o dono). Não guarda nada: o PDF sai na hora.
export async function POST(req) {
  const { user, profile } = await getProfile();
  if (!user || profile?.role !== 'master' || !profile.dono) return NextResponse.json({ error: 'sem permissão' }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  const reabrir = b.reabrir ? Number(b.reabrir) : null;
  if (reabrir) {
    const { data: r } = await createAdminClient().from('recibos').select('dados').eq('id', reabrir).gte('criado_em', new Date(Date.now() - 30 * 86400000).toISOString()).maybeSingle();
    if (!r) return NextResponse.json({ error: 'Recibo não encontrado (o histórico guarda 30 dias).' }, { status: 404 });
    const pdf = await gerarPdfRecibo(r.dados);
    return new NextResponse(pdf, { status: 200, headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline; filename="recibo.pdf"', 'Cache-Control': 'private, no-store' } });
  }
  const valor = Math.round(Number(String(b.valor ?? '').replace(/\./g, '').replace(',', '.')) * 100) / 100;
  if (!(valor > 0) || valor > 100000000) return NextResponse.json({ error: 'Informe o valor.' }, { status: 400 });
  const data = /^\d{4}-\d{2}-\d{2}$/.test(b.data || '') ? b.data : new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  const dados = {
    titulo: lim(b.titulo, 80), recebedor: lim(b.recebedor, 80), pagador: lim(b.pagador, 120), valor,
    descricao: lim(b.descricao, 300), detalhe: lim(b.detalhe, 200), data, cidade: lim(b.cidade, 60),
    empresa: lim(b.empresa, 120), endereco: lim(b.endereco, 160),
  };
  const pdf = await gerarPdfRecibo(dados);
  // histórico de 30 dias: guarda os dados (o PDF é refeito na hora) e apaga o que passou disso
  try {
    const admin = createAdminClient();
    await admin.from('recibos').insert({ criado_por: user.id, valor, dados });
    await admin.from('recibos').delete().lt('criado_em', new Date(Date.now() - 30 * 86400000).toISOString());
  } catch (e) {}
  return new NextResponse(pdf, { status: 200, headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline; filename="recibo.pdf"', 'Cache-Control': 'private, no-store' } });
}

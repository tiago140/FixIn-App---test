import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { gerarPdfRecibo } from '@/lib/gerarPdfRecibo';

export const dynamic = 'force-dynamic';
const lim = (v, n) => String(v ?? '').trim().slice(0, n);

// Gera o PDF do recibo (só o dono). Não guarda nada: o PDF sai na hora.
export async function POST(req) {
  const { user, profile } = await getProfile();
  if (!user || profile?.role !== 'master' || !profile.dono) return NextResponse.json({ error: 'sem permissão' }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  const valor = Math.round(Number(String(b.valor ?? '').replace(/\./g, '').replace(',', '.')) * 100) / 100;
  if (!(valor > 0) || valor > 100000000) return NextResponse.json({ error: 'Informe o valor.' }, { status: 400 });
  const data = /^\d{4}-\d{2}-\d{2}$/.test(b.data || '') ? b.data : new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  const pdf = await gerarPdfRecibo({
    titulo: lim(b.titulo, 80), recebedor: lim(b.recebedor, 80), pagador: lim(b.pagador, 120), valor,
    descricao: lim(b.descricao, 300), detalhe: lim(b.detalhe, 200), data, cidade: lim(b.cidade, 60),
    empresa: lim(b.empresa, 120), endereco: lim(b.endereco, 160),
  });
  return new NextResponse(pdf, { status: 200, headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline; filename="recibo.pdf"', 'Cache-Control': 'private, no-store' } });
}

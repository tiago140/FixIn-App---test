import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { dadosPagamento, linkTikpag, urlPagamento } from '@/lib/pagamentoOrcamento';

export const dynamic = 'force-dynamic';

// Link "Parcelar em até 21x com a TikPag" do PDF: monta o checkout da TikPag na hora (boleto + Pix atuais) e redireciona.
export async function GET(req, { params }) {
  const token = String(params.token || '');
  if (!/^[0-9a-f-]{36}$/i.test(token)) return NextResponse.redirect(new URL('/', req.url));
  // Só aqui (ao clicar) gera o boleto + Pix que a TikPag precisa; quem paga pela InfinitePay não cria cobrança extra sem pedir.
  const d = await dadosPagamento(createAdminClient(), token, { forcarAsaas: true });
  const destino = d.estado === 'ok' ? linkTikpag(d) : null;
  return NextResponse.redirect(destino || urlPagamento(token), 302);
}

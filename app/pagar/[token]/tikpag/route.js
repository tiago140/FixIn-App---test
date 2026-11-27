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
  const destino = d.estado === 'ok' && d.tikpagOk ? linkTikpag(d) : null;
  if (destino) return NextResponse.redirect(destino, 302);
  const motivo = !d.tikpagOk && d.estado === 'ok' ? 'A TikPag não está habilitada para este cliente.'
    : d.estado === 'aguardando_aprovacao' ? 'O orçamento ainda não foi aprovado.'
    : d.erro ? `Não foi possível gerar o boleto/Pix para a TikPag (${d.erro}).`
    : d.estado === 'ok' ? 'O boleto e o Pix não vieram com dados suficientes para montar o checkout.'
    : 'Pagamento indisponível no momento.';
  console.error('[tikpag]', d.estado, d.erro || '');
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  return new NextResponse(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:system-ui;max-width:440px;margin:40px auto;padding:0 16px;color:#1a2b4a"><h2>Não foi possível abrir o checkout da TikPag</h2><p>${esc(motivo)}</p><p><a href="${urlPagamento(token)}">Voltar e pagar pela InfinitePay</a></p></body>`, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

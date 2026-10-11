import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Aviso de pagamento da TikPag. AGUARDANDO A DOCUMENTAÇÃO: quando chegar, este arquivo valida o segredo,
// confere o pagamento com confirmarPagamento() (lib/tikpag.js) e dá baixa igual ao webhook do Asaas.
export async function POST() {
  return NextResponse.json({ error: 'integração TikPag ainda não ativada' }, { status: 501 });
}

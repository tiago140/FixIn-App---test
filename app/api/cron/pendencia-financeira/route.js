import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { estaAtrasado, diasDesde, calcularTotalComMargem, PRAZO_PAGAMENTO_DIAS } from '@/lib/format';
import { enviarEmailPendenciaFinanceira } from '@/lib/email';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Executado pelo Vercel Cron (ver vercel.json) uma vez por dia. A Vercel manda o header
// Authorization: Bearer <CRON_SECRET> automaticamente — comparamos pra garantir que não é
// qualquer um na internet disparando e-mail em massa pros seus clientes.
export async function GET(req) {
  const auth = req.headers.get('authorization');
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'não autorizado' }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: orcamentos, error } = await admin
    .from('orcamentos')
    .select('id, numero, endereco, status, aprovado_em, valor_pago, margem_percentual, pagamento_cliente_status, orcamento_itens(mo, ma), clientes(nome_empresa, email)')
    .in('status', ['aprovado', 'em_execucao'])
    .neq('pagamento_cliente_status', 'pago_total');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let enviados = 0;
  const detalhes = [];
  for (const o of orcamentos || []) {
    if (!estaAtrasado(o)) continue;
    const total = calcularTotalComMargem(o.orcamento_itens, o.margem_percentual);
    const pendente = Math.max(0, total - (Number(o.valor_pago) || 0));
    const resultado = await enviarEmailPendenciaFinanceira({
      paraEmail: o.clientes?.email,
      nomeImobiliaria: o.clientes?.nome_empresa,
      numero: o.numero,
      endereco: o.endereco,
      valorPendente: pendente,
      diasAtraso: diasDesde(o.aprovado_em) - PRAZO_PAGAMENTO_DIAS,
    });
    detalhes.push({ numero: o.numero, ...resultado });
    if (resultado.enviado) enviados++;
  }

  return NextResponse.json({ ok: true, verificados: (orcamentos || []).length, enviados, detalhes });
}

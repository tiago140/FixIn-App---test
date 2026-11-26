import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { calcularAlvo, textoComprovante, urlPagamento, SITE, MAX_PARTES, MIN_PARTE } from '@/lib/pagamentoOrcamento';
import { criarLink } from '@/lib/infinitepay';
import { hojeSP, somarDias } from '@/lib/lancamentos';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// O próprio cliente divide o pagamento em até 2 partes (ex.: Pix + cartão, ou dois cartões).
// Cada parte vira um link de pagamento único da InfinitePay; o orçamento fica pago quando todas forem quitadas.
export async function POST(req, { params }) {
  const token = String(params.token || '');
  if (!/^[0-9a-f-]{36}$/i.test(token)) return NextResponse.json({ error: 'link inválido' }, { status: 404 });
  const b = await req.json().catch(() => ({}));
  const centavos = (Array.isArray(b.valores) ? b.valores : []).map((v) => Math.round(Number(String(v).replace(',', '.')) * 100));
  if (centavos.length < 1 || centavos.length > MAX_PARTES || centavos.some((c) => !Number.isFinite(c) || c <= 0)) return NextResponse.json({ error: `Divida em 1 a ${MAX_PARTES} partes.` }, { status: 400 });

  const admin = createAdminClient();
  const { data: o } = await admin.from('orcamentos').select('id, numero, endereco, cliente_id, parcelado_negociado').eq('pagar_token', token).maybeSingle();
  if (!o?.cliente_id) return NextResponse.json({ error: 'link inválido' }, { status: 404 });
  const { data: cli } = await admin.from('clientes').select('pagamento_provedor').eq('id', o.cliente_id).maybeSingle();
  if (cli?.pagamento_provedor !== 'infinitepay') return NextResponse.json({ error: 'indisponível' }, { status: 400 });
  const { data: l } = await admin.from('lancamentos').select('*').eq('orcamento_id', o.id).eq('tipo', 'receber').eq('origem', 'orcamento').neq('status', 'cancelado').maybeSingle();
  if (!l || l.status === 'pago') return NextResponse.json({ error: 'nada a pagar' }, { status: 400 });
  const { alvo, parcela, entrada } = calcularAlvo(o, l);
  if (alvo <= 0) return NextResponse.json({ error: 'nada a pagar' }, { status: 400 });
  if (centavos.reduce((t, c) => t + c, 0) !== Math.round(alvo * 100)) return NextResponse.json({ error: 'As partes precisam somar exatamente o valor a pagar.' }, { status: 400 });
  if (centavos.length > 1 && centavos.some((c) => c < MIN_PARTE * 100)) return NextResponse.json({ error: `Cada parte precisa ter pelo menos R$ ${MIN_PARTE}.` }, { status: 400 });

  const hoje = hojeSP(); const vencimento = somarDias(hoje, 3); const agora = new Date().toISOString();
  const { data: abertas } = await admin.from('cobrancas').select('id').eq('lancamento_id', l.id).eq('provedor', 'infinitepay').eq('status', 'pendente');
  try {
    const novas = [];
    for (let i = 0; i < centavos.length; i++) {
      const valor = centavos[i] / 100; const orderNsu = randomUUID();
      const sufixo = centavos.length > 1 ? ` parte ${i + 1} de ${centavos.length}` : (entrada ? ' entrada 50%' : parcela === 'saldo' ? ' saldo' : '');
      const obs = textoComprovante(o, sufixo);
      const url = await criarLink({ orderNsu, valor, descricao: obs, redirectUrl: urlPagamento(token), webhookUrl: `${SITE}/api/webhooks/infinitepay` });
      novas.push({ lancamento_id: l.id, provedor: 'infinitepay', parcela, valor, externo_id: orderNsu, url, tipo_cobranca: 'LINK', vencimento, observacao: obs });
    }
    const { error } = await admin.from('cobrancas').insert(novas);
    if (error) throw new Error('não salvou');
    // só cancela as antigas depois que as novas existem (um link antigo já pago ainda dá baixa)
    for (const c of abertas || []) await admin.from('cobrancas').update({ status: 'cancelada', atualizado_em: agora }).eq('id', c.id);
  } catch (e) {
    return NextResponse.json({ error: 'Não foi possível criar os links agora. Tente de novo.' }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}

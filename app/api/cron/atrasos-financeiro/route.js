import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { enviarEmailAvisoImobiliaria } from '@/lib/email';
import { hojeSP, somarDias, emAberto, saldoAberto } from '@/lib/lancamentos';
import { fmtBRL, fmtDate } from '@/lib/format';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const dias = (de, ate) => Math.round((new Date(ate + 'T12:00:00Z') - new Date(de + 'T12:00:00Z')) / 86400000);

// Resumo diário para o DONO: o que está atrasado a receber, o que está atrasado a pagar e o que vence nos próximos 3 dias.
// Só envia se houver algo. Mesma proteção dos outros cron: precisa do CRON_SECRET.
export async function GET(req) {
  if (!process.env.CRON_SECRET || req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'não autorizado' }, { status: 401 });
  }
  const admin = createAdminClient();
  const hoje = hojeSP();
  const limite = somarDias(hoje, 3);

  const { data: ls, error } = await admin.from('lancamentos').select('id, tipo, descricao, valor, valor_pago, vencimento, status, clientes(nome_empresa), prestadores(nome)').in('status', ['previsto', 'aprovado']).lte('vencimento', limite).order('vencimento', { ascending: true }).limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const abertos = (ls || []).filter((l) => emAberto(l) && saldoAberto(l) > 0);
  const recAtraso = abertos.filter((l) => l.tipo === 'receber' && l.vencimento < hoje);
  const pagAtraso = abertos.filter((l) => l.tipo === 'pagar' && l.vencimento < hoje);
  const proximos = abertos.filter((l) => l.vencimento >= hoje);
  if (!recAtraso.length && !pagAtraso.length && !proximos.length) return NextResponse.json({ ok: true, enviado: false, motivo: 'nada vencido' });

  const soma = (arr) => arr.reduce((a, l) => a + saldoAberto(l), 0);
  const linha = (l) => `<tr><td style="padding:4px 8px;border-bottom:1px solid #eee">${esc(l.descricao)}${l.clientes?.nome_empresa ? ` <span style="color:#778">· ${esc(l.clientes.nome_empresa)}</span>` : ''}${l.prestadores?.nome ? ` <span style="color:#778">· ${esc(l.prestadores.nome)}</span>` : ''}</td><td style="padding:4px 8px;border-bottom:1px solid #eee;white-space:nowrap">${fmtDate(l.vencimento)}${l.vencimento < hoje ? ` <b style="color:#b91c1c">(${dias(l.vencimento, hoje)} d)</b>` : ''}</td><td style="padding:4px 8px;border-bottom:1px solid #eee;text-align:right;white-space:nowrap"><b>${fmtBRL(saldoAberto(l))}</b></td></tr>`;
  const bloco = (titulo, arr, cor) => (arr.length ? `<h3 style="color:${cor};margin:18px 0 6px">${titulo} — ${fmtBRL(soma(arr))} (${arr.length})</h3><table style="border-collapse:collapse;width:100%;font-size:13px">${arr.slice(0, 25).map(linha).join('')}</table>${arr.length > 25 ? `<p style="font-size:12px;color:#778">+ ${arr.length - 25} outros no sistema.</p>` : ''}` : '');

  const corpo = `<p>Bom dia! Este é o resumo do financeiro de hoje (${fmtDate(hoje)}).</p>
    ${bloco('A receber em atraso', recAtraso, '#b91c1c')}
    ${bloco('A pagar em atraso', pagAtraso, '#b91c1c')}
    ${bloco('Vence nos próximos 3 dias', proximos, '#B45309')}`;

  const { data: dono } = await admin.from('profiles').select('email').eq('dono', true).maybeSingle();
  const para = process.env.AVISO_FINANCEIRO_EMAIL || dono?.email;
  if (!para) return NextResponse.json({ ok: false, motivo: 'sem e-mail do dono' });
  const r = await enviarEmailAvisoImobiliaria({
    para,
    assunto: `Financeiro: ${recAtraso.length + pagAtraso.length} em atraso${proximos.length ? `, ${proximos.length} vencendo` : ''}`,
    titulo: 'Resumo do financeiro',
    corpoHtml: corpo,
    link: 'https://app.fixinreformas.com/master/financeiro/visao?f=atrasados',
    textoBotao: 'Abrir visão por orçamento',
  });
  return NextResponse.json({ ok: !!r.enviado, ...r, atrasadosReceber: recAtraso.length, atrasadosPagar: pagAtraso.length, proximos: proximos.length });
}

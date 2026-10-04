import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { createAdminClient } from '@/lib/supabase/admin';
import { veValores } from '@/lib/permissoes';

// A imobiliária envia o comprovante. Só ela (dona daquele orçamento) pode enviar — o dono só verifica.
export async function POST(req, { params }) {
  const { user, profile, supabase } = await getProfile();
  if (!user) return NextResponse.json({ error: 'sem permissão' }, { status: 403 });
  const id = params.id;

  // O dono lê a tabela; a imobiliária só enxerga o orçamento pela visão protegida (que já filtra pelo cliente dela).
  const tabelaOrc = profile.role === 'master' ? 'orcamentos' : 'orcamentos_cliente';
  const { data: orc } = await supabase.from(tabelaOrc).select('id, cliente_id, numero').eq('id', id).single();
  if (!orc) return NextResponse.json({ error: 'orçamento não encontrado' }, { status: 404 });
  if (profile.role === 'master' ? false : orc.cliente_id !== profile.cliente_id) {
    return NextResponse.json({ error: 'este orçamento não é da sua imobiliária' }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get('arquivo');
  const tipo = formData.get('tipo_pagamento');
  let valor = Number(formData.get('valor')) || 0;
  if (!file || !['entrada', 'integral'].includes(tipo)) {
    return NextResponse.json({ error: 'selecione o arquivo e o tipo de pagamento' }, { status: 400 });
  }

  // Quem não vê valores (operacional) não informa o valor: o servidor define pelo tipo —
  // entrada = metade do total, integral = total. O número nunca passa pela tela dele.
  if (!veValores(profile)) {
    const { data: totalCru } = await createAdminClient().rpc('total_orcamento_interno', { p_id: id });
    const totalNum = Number(totalCru) || 0;
    valor = Math.round((tipo === 'entrada' ? totalNum / 2 : totalNum) * 100) / 100;
  }

  // Data em que o pagamento foi feito (aaaa-mm-dd). Vazia = hoje (horário de Brasília). Não pode ser futura.
  const hojeBR = new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);
  const dataPagamento = String(formData.get('data_pagamento') || '').trim() || hojeBR;
  // Confere que o dia existe de verdade (o JavaScript aceitaria 31/02 e "viraria" 3 de março).
  const [anoP, mesP, diaP] = dataPagamento.split('-').map(Number);
  const dataReal = new Date(Date.UTC(anoP, mesP - 1, diaP));
  const diaExiste = /^\d{4}-\d{2}-\d{2}$/.test(dataPagamento) && dataReal.getUTCFullYear() === anoP && dataReal.getUTCMonth() === mesP - 1 && dataReal.getUTCDate() === diaP;
  if (!diaExiste) {
    return NextResponse.json({ error: 'data do pagamento inválida' }, { status: 400 });
  }
  if (dataPagamento > hojeBR) {
    return NextResponse.json({ error: 'a data do pagamento não pode ser no futuro' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const caminho = `${id}/${Date.now()}-${file.name}`;
  const { error: erroUpload } = await supabase.storage
    .from('comprovantes-pagamento')
    .upload(caminho, buffer, { contentType: file.type, upsert: false });
  if (erroUpload) return NextResponse.json({ error: erroUpload.message }, { status: 400 });

  const { error: erroInsert } = await supabase
    .from('orcamento_comprovantes')
    .insert({ orcamento_id: id, arquivo_path: caminho, tipo_pagamento: tipo, valor, data_pagamento: dataPagamento, enviado_por: user.id });
  if (erroInsert) return NextResponse.json({ error: erroInsert.message }, { status: 400 });

  await supabase.from('auditoria').insert({
    acao: 'Enviou comprovante de pagamento',
    detalhe: `${orc.numero}: ${tipo === 'entrada' ? 'Entrada' : 'Integral'} — R$ ${valor.toFixed(2)} (pago em ${dataPagamento.split('-').reverse().join('/')})`,
    alvo_tipo: 'orcamento', alvo_id: id,
    autor_id: user.id, autor_nome: profile.nome_completo, autor_role: profile.role,
  });

  return NextResponse.json({ ok: true });
}

// O dono confere e confirma: marca o comprovante como verificado, atualiza o valor pago
// e o status de pagamento do orçamento (mesmo padrão já usado para o pagamento ao prestador).
export async function PATCH(req, { params }) {
  const { user, profile, supabase } = await getProfile();
  if (!user || profile.role !== 'master') return NextResponse.json({ error: 'sem permissão' }, { status: 403 });
  const id = params.id;
  const { comprovante_id, valor_pago, pagamento_cliente_status } = await req.json();

  if (!['entrada_paga', 'pago_total'].includes(pagamento_cliente_status)) {
    return NextResponse.json({ error: 'status de pagamento inválido' }, { status: 400 });
  }

  const { error: erroComp } = await supabase
    .from('orcamento_comprovantes')
    .update({ verificado: true })
    .eq('id', comprovante_id)
    .eq('orcamento_id', id);
  if (erroComp) return NextResponse.json({ error: erroComp.message }, { status: 400 });

  const { data: orc } = await supabase.from('orcamentos').select('numero, data_deposito').eq('id', id).single();
  const { data: comp } = await supabase.from('orcamento_comprovantes').select('data_pagamento').eq('id', comprovante_id).eq('orcamento_id', id).single();

  const atualizacao = {
    valor_pago: Number(valor_pago) || 0,
    pagamento_cliente_status,
    pagamento_verificado_por: user.id,
    pagamento_verificado_em: new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
  };
  // "Data Depósito" do Controle: vem sozinha da data de pagamento do comprovante confirmado.
  // Só preenche se estiver vazia — nunca apaga o que o dono digitou à mão. Com entrada + saldo,
  // vale o primeiro pagamento confirmado (o da entrada).
  if (comp?.data_pagamento && !orc?.data_deposito) atualizacao.data_deposito = comp.data_pagamento;

  const { error: erroOrc } = await supabase
    .from('orcamentos')
    .update(atualizacao)
    .eq('id', id);
  if (erroOrc) return NextResponse.json({ error: erroOrc.message }, { status: 400 });

  await supabase.from('auditoria').insert({
    acao: 'Confirmou pagamento do cliente',
    detalhe: `${orc?.numero || ''}: ${pagamento_cliente_status === 'pago_total' ? 'Pago integral' : 'Entrada'} — R$ ${Number(valor_pago).toFixed(2)}`,
    alvo_tipo: 'orcamento', alvo_id: id,
    autor_id: user.id, autor_nome: profile.nome_completo, autor_role: profile.role,
  });

  return NextResponse.json({ ok: true });
}

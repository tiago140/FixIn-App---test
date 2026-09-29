import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';

// A imobiliária envia o comprovante. Só ela (dona daquele orçamento) pode enviar — o dono só verifica.
export async function POST(req, { params }) {
  const { user, profile, supabase } = await getProfile();
  if (!user) return NextResponse.json({ error: 'sem permissão' }, { status: 403 });
  const id = params.id;

  const { data: orc } = await supabase.from('orcamentos').select('id, cliente_id, numero').eq('id', id).single();
  if (!orc) return NextResponse.json({ error: 'orçamento não encontrado' }, { status: 404 });
  if (profile.role === 'master' ? false : orc.cliente_id !== profile.cliente_id) {
    return NextResponse.json({ error: 'este orçamento não é da sua imobiliária' }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get('arquivo');
  const tipo = formData.get('tipo_pagamento');
  const valor = Number(formData.get('valor')) || 0;
  if (!file || !['entrada', 'integral'].includes(tipo)) {
    return NextResponse.json({ error: 'selecione o arquivo e o tipo de pagamento' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const caminho = `${id}/${Date.now()}-${file.name}`;
  const { error: erroUpload } = await supabase.storage
    .from('comprovantes-pagamento')
    .upload(caminho, buffer, { contentType: file.type, upsert: false });
  if (erroUpload) return NextResponse.json({ error: erroUpload.message }, { status: 400 });

  const { data: comprovante, error: erroInsert } = await supabase
    .from('orcamento_comprovantes')
    .insert({ orcamento_id: id, arquivo_path: caminho, tipo_pagamento: tipo, valor, enviado_por: user.id })
    .select()
    .single();
  if (erroInsert) return NextResponse.json({ error: erroInsert.message }, { status: 400 });

  await supabase.from('auditoria').insert({
    acao: 'Enviou comprovante de pagamento',
    detalhe: `${orc.numero}: ${tipo === 'entrada' ? 'Entrada' : 'Integral'} — R$ ${valor.toFixed(2)}`,
    alvo_tipo: 'orcamento', alvo_id: id,
    autor_id: user.id, autor_nome: profile.nome_completo, autor_role: profile.role,
  });

  return NextResponse.json({ ok: true, comprovante });
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

  const { data: orc } = await supabase.from('orcamentos').select('numero').eq('id', id).single();

  const { error: erroOrc } = await supabase
    .from('orcamentos')
    .update({
      valor_pago: Number(valor_pago) || 0,
      pagamento_cliente_status,
      pagamento_verificado_por: user.id,
      pagamento_verificado_em: new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
    })
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

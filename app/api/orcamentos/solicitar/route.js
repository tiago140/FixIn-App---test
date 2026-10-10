import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { createAdminClient } from '@/lib/supabase/admin';
import { organizarSeguroFianca } from '@/lib/seguroFianca';

export async function POST(req) {
  const { user, profile, supabase } = await getProfile();
  if (!user || profile?.role !== 'imobiliaria') {
    return NextResponse.json({ error: 'sem permissão' }, { status: 403 });
  }
  const { endereco, tipo, descricao, nome_cliente_final, cpf_cliente_final, cnpj_cliente_final, itens, vistoria_texto_bruto, seguro_fianca } = await req.json();
  const seguro = seguro_fianca === true || seguro_fianca === 'sim';
  if (!endereco) return NextResponse.json({ error: 'informe o endereço' }, { status: 400 });

  const { data, error } = await supabase.rpc('solicitar_orcamento', {
    p_endereco: endereco,
    p_tipo: tipo || 'rescisao',
    p_descricao: descricao || null,
    p_nome_cliente_final: nome_cliente_final || null,
    p_cpf_cliente_final: cpf_cliente_final || null,
    p_cnpj_cliente_final: cnpj_cliente_final || null,
    p_itens: seguro ? organizarSeguroFianca(itens || [], { dividir: true }) : itens || [],
    p_vistoria_texto: vistoria_texto_bruto || null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  // a função do banco não recebe o campo: grava no orçamento recém-criado (que é desta imobiliária) pelo servidor
  if (seguro && data) {
    try { await createAdminClient().from('orcamentos').update({ seguro_fianca: true }).eq('id', data).eq('cliente_id', profile.cliente_id); } catch (e) {}
  }
  return NextResponse.json({ ok: true, id: data });
}


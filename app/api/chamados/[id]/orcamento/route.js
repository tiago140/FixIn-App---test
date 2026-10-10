import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { createAdminClient } from '@/lib/supabase/admin';
import { acessoChamado } from '@/lib/chamados';

// Cria o orçamento deste chamado (já com o endereço) e liga os dois. Os itens são preenchidos na tela do orçamento.
export async function POST(req, { params }) {
  const a = await acessoChamado(getProfile, params.id);
  if (a.erro) return NextResponse.json({ error: a.erro }, { status: a.status });
  const ch = a.chamado;
  if (ch.orcamento_id) return NextResponse.json({ ok: true, id: ch.orcamento_id, ja_existia: true });

  let id = null;
  if (a.profile.role === 'master') {
    const { data, error } = await a.supabase.from('orcamentos').insert({
      cliente_id: ch.cliente_id, endereco: ch.endereco, tipo: 'manutencao', status: 'pendente', criado_por: a.user.id,
      forma_pagamento: 'Pix ou Transferência: à vista', validade_dias: 30, margem_percentual: 0,
      nome_cliente_final: ch.solicitante_nome, vistoria_texto_bruto: `${ch.titulo}\n${ch.descricao}`,
    }).select('id').single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    id = data.id;
  } else {
    const { data, error } = await a.supabase.rpc('solicitar_orcamento', {
      p_endereco: ch.endereco, p_tipo: 'manutencao', p_descricao: `Chamado ${ch.numero}: ${ch.titulo}\n${ch.descricao}`,
      p_nome_cliente_final: ch.solicitante_nome, p_cpf_cliente_final: null, p_cnpj_cliente_final: null, p_itens: [], p_vistoria_texto: `${ch.titulo}\n${ch.descricao}`,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    id = data;
  }
  const admin = createAdminClient();
  await admin.from('chamados').update({ orcamento_id: id, status: 'em_analise', atualizado_em: new Date().toISOString() }).eq('id', ch.id);
  await admin.from('chamado_mensagens').insert({ chamado_id: ch.id, autor_tipo: 'sistema', autor_nome: 'Sistema', texto: 'Estamos preparando o orçamento deste chamado.' });
  return NextResponse.json({ ok: true, id });
}

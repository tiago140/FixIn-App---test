import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { calcularProximoStatusAutomatico, STATUS_LABEL } from '@/lib/format';

export async function PATCH(req, { params }) {
  const { user, profile, supabase } = await getProfile();
  if (!user || profile?.role !== 'master') {
    return NextResponse.json({ error: 'sem permissão' }, { status: 403 });
  }

  const id = params.id;
  const body = await req.json();
  const { itens, ...camposOrcamento } = body;

  const { data: antes } = await supabase.from('orcamentos').select('*, orcamento_itens(mo,ma)').eq('id', id).single();

  if (Object.keys(camposOrcamento).length > 0) {
    camposOrcamento.atualizado_em = new Date().toISOString();
    if (camposOrcamento.status === 'aprovado') camposOrcamento.aprovado_em = new Date().toISOString();
    if (camposOrcamento.status) camposOrcamento.migrado_automaticamente = false;
    const { error } = await supabase.from('orcamentos').update(camposOrcamento).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    if (antes) {
      if (camposOrcamento.cliente_id && camposOrcamento.cliente_id !== antes.cliente_id) {
        await registrarAuditoria(supabase, user, profile, 'Trocou imobiliária do orçamento', `${antes.numero}`, 'orcamento', id);
      }
      if (camposOrcamento.status && camposOrcamento.status !== antes.status) {
        await registrarAuditoria(supabase, user, profile, 'Mudou status', `${antes.numero}: ${STATUS_LABEL[antes.status]} → ${STATUS_LABEL[camposOrcamento.status]}`, 'orcamento', id);
      }
      if (camposOrcamento.valor_pago != null) {
        await registrarAuditoria(supabase, user, profile, 'Registrou pagamento', `${antes.numero}`, 'orcamento', id);
      }
      if (camposOrcamento.prestador_id !== undefined) {
        await registrarAuditoria(supabase, user, profile, 'Atribuiu prestador', `${antes.numero}`, 'orcamento', id);
        const orcAtualizado = { ...antes, prestador_id: camposOrcamento.prestador_id };
        await aplicarMigracaoAutomatica(supabase, orcAtualizado, 'prestador');
      }
      if (camposOrcamento.valor_pago != null) {
        const orcAtualizado = { ...antes, valor_pago: camposOrcamento.valor_pago };
        await aplicarMigracaoAutomatica(supabase, orcAtualizado, 'pagamento');
      }
    }
  }

  if (Array.isArray(itens)) {
    const { error: erroDelete } = await supabase.from('orcamento_itens').delete().eq('orcamento_id', id);
    if (erroDelete) return NextResponse.json({ error: erroDelete.message }, { status: 400 });

    if (itens.length > 0) {
      const paraInserir = itens.map((it, i) => ({
        orcamento_id: id,
        ambiente: it.ambiente,
        servico: it.servico,
        descricao: it.descricao || '',
        mo: Number(it.mo) || 0,
        ma: Number(it.ma) || 0,
        ordem: i,
      }));
      const { error: erroInsert } = await supabase.from('orcamento_itens').insert(paraInserir);
      if (erroInsert) return NextResponse.json({ error: erroInsert.message }, { status: 400 });
    }
    if (antes) await registrarAuditoria(supabase, user, profile, 'Editou itens/margem', `${antes.numero}: ${itens.length} item(ns)`, 'orcamento', id);
  }

  return NextResponse.json({ ok: true });
}

async function aplicarMigracaoAutomatica(supabase, orcamento, gatilho) {
  const novoStatus = calcularProximoStatusAutomatico(orcamento, gatilho);
  if (!novoStatus) return;
  await supabase.from('orcamentos').update({ status: novoStatus, atualizado_em: new Date().toISOString(), migrado_automaticamente: true }).eq('id', orcamento.id);
}

async function registrarAuditoria(supabase, user, profile, acao, detalhe, alvoTipo, alvoId) {
  try {
    await supabase.from('auditoria').insert({
      acao, detalhe, alvo_tipo: alvoTipo, alvo_id: alvoId,
      autor_id: user.id, autor_nome: profile.nome_completo, autor_role: profile.role,
    });
  } catch (e) {
    // auditoria nunca deve travar a operação principal
  }
}


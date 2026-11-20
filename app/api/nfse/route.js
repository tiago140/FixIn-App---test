import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/getProfile';
import { createAdminClient } from '@/lib/supabase/admin';
import { asaas } from '@/lib/asaas';
import { emitirNota, valoresMoMa, validarTomador, aplicarNotaDoAsaas } from '@/lib/nfse';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const soDig = (s) => String(s ?? '').replace(/\D/g, '');
const lim = (v, n) => String(v ?? '').trim().slice(0, n);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Ações da nota fiscal: emitir | atualizar | cancelar | config. Só o DONO.
export async function POST(req) {
  const { user, profile } = await getProfile();
  if (!user || profile?.role !== 'master' || !profile.dono) return NextResponse.json({ error: 'sem permissão' }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  const admin = createAdminClient();
  const { data: cfg } = await admin.from('nf_config').select('*').eq('id', 1).maybeSingle();

  try {
    if (b.acao === 'config') {
      const n = (v) => Math.max(0, Math.min(100, Number(String(v ?? 0).replace(',', '.')) || 0));
      const c = {
        nf_ativo: !!b.nf_ativo, nf_servico_id: lim(b.nf_servico_id, 80) || null, nf_servico_codigo: lim(b.nf_servico_codigo, 40) || null,
        nf_servico_nome: lim(b.nf_servico_nome, 300) || null, nf_obs: lim(b.nf_obs, 500) || null, nf_retem_iss: !!b.nf_retem_iss,
        nf_iss: n(b.nf_iss), nf_cofins: n(b.nf_cofins), nf_csll: n(b.nf_csll), nf_inss: n(b.nf_inss), nf_ir: n(b.nf_ir), nf_pis: n(b.nf_pis),
        nf_nbs: lim(b.nf_nbs, 20) || null, nf_cst: lim(b.nf_cst, 20) || null, nf_class_trib: lim(b.nf_class_trib, 20) || null, nf_ind_op: lim(b.nf_ind_op, 20) || null,
      };
      const { error } = await admin.from('nf_config').update(c).eq('id', 1);
      if (error) return NextResponse.json({ error: 'Não foi possível salvar.' }, { status: 400 });
      return NextResponse.json({ ok: true });
    }

    if (b.acao === 'emitir') {
      let reg;
      if (b.id) { // tentar de novo
        const { data } = await admin.from('notas_fiscais').select('*').eq('id', Number(b.id)).maybeSingle(); reg = data;
        if (!reg) return NextResponse.json({ error: 'Nota não encontrada.' }, { status: 404 });
        if (reg.nota_fiscal?.id && !['ERROR', 'CANCELED', 'ERRO'].includes(reg.nota_fiscal.status)) return NextResponse.json({ error: 'Esta nota já foi pedida ao Asaas.' }, { status: 400 });
      } else {
        if (!UUID.test(String(b.orcamento_id || ''))) return NextResponse.json({ error: 'Escolha o orçamento.' }, { status: 400 });
        const { data: o } = await admin.from('orcamentos').select('id, numero, endereco, cliente_id, margem_percentual, orcamento_itens(mo, ma)').eq('id', b.orcamento_id).maybeSingle();
        if (!o) return NextResponse.json({ error: 'Orçamento não encontrado.' }, { status: 404 });
        // já existe nota válida para este orçamento? evita emitir duas vezes sem querer
        const { data: ja } = await admin.from('notas_fiscais').select('id, nota_fiscal').eq('orcamento_id', o.id);
        if ((ja || []).some((x) => !['ERROR', 'ERRO', 'CANCELED'].includes(x.nota_fiscal?.status || 'ERRO') && x.nota_fiscal?.id) && b.confirmar_outra !== true) return NextResponse.json({ error: 'Este orçamento já tem uma nota fiscal. Cancele a anterior ou confirme que é outra nota.', ja_tem: true }, { status: 409 });
        const { mo, ma } = valoresMoMa(o.orcamento_itens, o.margem_percentual);
        // valor: o da mão de obra (padrão). O dono pode ajustar para menos (ex.: nota parcial), nunca acima da mão de obra.
        let valor = mo;
        if (b.valor != null && b.valor !== '') { valor = Math.round(Number(String(b.valor).replace(',', '.')) * 100) / 100; }
        if (!(valor > 0)) return NextResponse.json({ error: 'Este orçamento não tem mão de obra para emitir nota.' }, { status: 400 });
        if (valor > mo + 0.009) return NextResponse.json({ error: `A nota de serviço é só da mão de obra (${mo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}). O material sai em nota de produto.` }, { status: 400 });
        const t = b.tomador || {};
        const tomador = { nome: lim(t.nome, 160), cpf_cnpj: soDig(t.cpf_cnpj), email: lim(t.email, 160).toLowerCase(), telefone: soDig(t.telefone), cep: soDig(t.cep), endereco: lim(t.endereco, 160), numero: lim(t.numero, 20), complemento: lim(t.complemento, 80), bairro: lim(t.bairro, 80), cidade: lim(t.cidade, 80) };
        const erroT = validarTomador(tomador); if (erroT) return NextResponse.json({ error: erroT }, { status: 400 });
        const descricao = lim(b.descricao, 1000) || `Serviços de mão de obra — reforma/manutenção do imóvel ${o.endereco} (orçamento ${o.numero})`;
        const ins = await admin.from('notas_fiscais').insert({ criado_por: user.id, orcamento_id: o.id, tomador, descricao, valor, valor_material: ma, obs: lim(b.obs, 500) || null }).select('*').single();
        if (ins.error) return NextResponse.json({ error: 'Não foi possível registrar o pedido.' }, { status: 400 });
        reg = ins.data;
        // guarda o endereço do tomador na imobiliária, para não digitar de novo
        if (o.cliente_id) await admin.from('clientes').update({ nf_tomador: tomador }).eq('id', o.cliente_id);
      }
      try {
        const nf = await emitirNota(admin, cfg, reg);
        try { await admin.from('auditoria').insert({ acao: 'NFS-e pedida (mão de obra)', detalhe: `nota #${reg.id} · R$ ${Number(reg.valor).toFixed(2)}`, alvo_tipo: 'orcamento', alvo_id: reg.orcamento_id, autor_id: user.id, autor_nome: profile.nome_completo, autor_role: profile.role }); } catch (e) {}
        return NextResponse.json({ ok: true, id: reg.id, nota_fiscal: nf });
      } catch (e) {
        const erro = String(e?.message || e).slice(0, 300); const agora = new Date().toISOString();
        await admin.from('notas_fiscais').update({ nota_fiscal: { status: 'ERRO', erro, em: agora }, atualizado: agora }).eq('id', reg.id);
        return NextResponse.json({ ok: false, id: reg.id, error: erro }, { status: 200 });
      }
    }

    if (b.acao === 'atualizar') {
      const { data: regs } = await admin.from('notas_fiscais').select('id, nota_fiscal').not('nota_fiscal->>id', 'is', null).order('id', { ascending: false }).limit(60);
      let mudou = 0;
      for (const reg of regs || []) {
        const nf = reg.nota_fiscal;
        if (b.id ? reg.id !== Number(b.id) : (['AUTHORIZED', 'CANCELED'].includes(nf.status) && nf.pdf)) continue;
        try {
          const inv = await asaas('/invoices/' + nf.id);
          if (inv.status !== nf.status || (inv.pdfUrl && inv.pdfUrl !== nf.pdf) || (inv.number && String(inv.number) !== String(nf.numero || ''))) { await aplicarNotaDoAsaas(admin, reg, inv, 'CONSULTA_' + inv.status); mudou++; }
        } catch (e) { /* próxima */ }
      }
      return NextResponse.json({ ok: true, mudou });
    }

    if (b.acao === 'cancelar') {
      const { data: reg } = await admin.from('notas_fiscais').select('*').eq('id', Number(b.id)).maybeSingle();
      if (!reg) return NextResponse.json({ error: 'Nota não encontrada.' }, { status: 404 });
      const agora = new Date().toISOString();
      if (reg.nota_fiscal?.id && !['CANCELED', 'ERROR', 'ERRO'].includes(reg.nota_fiscal.status)) {
        const r = await asaas(`/invoices/${reg.nota_fiscal.id}/cancel`, { method: 'POST' });
        const status = r?.status || 'PROCESSING_CANCELLATION';
        await admin.from('notas_fiscais').update({ nota_fiscal: { ...reg.nota_fiscal, status, atualizado: agora, historico: [...(reg.nota_fiscal.historico || []), { em: agora, ev: 'CANCELAMENTO_PEDIDO' }].slice(-30) }, atualizado: agora }).eq('id', reg.id);
        return NextResponse.json({ ok: true, status });
      }
      await admin.from('notas_fiscais').update({ nota_fiscal: { ...(reg.nota_fiscal || {}), status: 'CANCELED', atualizado: agora }, atualizado: agora }).eq('id', reg.id);
      return NextResponse.json({ ok: true, status: 'CANCELED' });
    }
    return NextResponse.json({ error: 'ação inválida' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: String(e?.message || e).slice(0, 300) }, { status: 400 });
  }
}

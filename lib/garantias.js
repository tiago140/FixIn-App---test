import { createAdminClient } from '@/lib/supabase/admin';
import { vencimentoGarantia } from '@/lib/ordensArquivos';

// Garantias dos serviços já aprovados do prestador: prazo vem do orçamento ligado à ordem; conta a partir da aprovação.
export async function garantiasDoPrestador(prestadorId) {
  const admin = createAdminClient();
  const { data: ordens } = await admin.from('ordens_servico')
    .select('id, numero, endereco, status, revisado_em, concluido_em, orcamento_id')
    .eq('prestador_id', prestadorId).in('status', ['aprovada', 'paga']).order('revisado_em', { ascending: false });
  const ids = [...new Set((ordens || []).map((o) => o.orcamento_id).filter(Boolean))];
  let mapa = {};
  if (ids.length) {
    const { data: orcs } = await admin.from('orcamentos').select('id, numero, garantia').in('id', ids);
    mapa = Object.fromEntries((orcs || []).map((o) => [o.id, o]));
  }
  return (ordens || []).map((o) => {
    const orc = mapa[o.orcamento_id];
    const base = o.revisado_em || o.concluido_em;
    const venc = vencimentoGarantia(orc?.garantia, base);
    return { ...o, orcamento_numero: orc?.numero || null, garantia: orc?.garantia || null, vencimento: venc };
  });
}

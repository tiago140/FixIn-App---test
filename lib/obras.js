import { createAdminClient } from '@/lib/supabase/admin';
import { urlSite } from '@/lib/chamados';

// Obras (ordens de serviço aceitas) de um orçamento, com o link de acompanhamento e os interessados incluídos.
// Chamar só depois de checar que a pessoa pode ver o orçamento / a ordem.
export async function carregarObras(orcamentoId, { osId = null } = {}) {
  try {
    const admin = createAdminClient();
    let q = admin.from('ordens_servico').select('id, numero, status, iniciada_em, iniciada_por, token_acompanhamento, acompanhamento_ativo').not('status', 'in', '(enviada,recusada,cancelada)').order('criado_em');
    q = osId ? q.eq('id', osId) : q.eq('orcamento_id', orcamentoId);
    const { data: ordens } = await q;
    if (!ordens?.length) return [];
    const { data: ints } = await admin.from('os_interessados').select('id, os_id, nome, email, whatsapp').in('os_id', ordens.map((o) => o.id)).order('criado_em');
    return ordens.map((o) => ({
      id: o.id, numero: o.numero, iniciada_em: o.iniciada_em, iniciada_por: o.iniciada_por,
      link: o.acompanhamento_ativo && o.token_acompanhamento ? `${urlSite()}/acompanhar/${o.token_acompanhamento}` : null,
      interessados: (ints || []).filter((i) => i.os_id === o.id).map(({ id, nome, email, whatsapp }) => ({ id, nome, email, whatsapp })),
    }));
  } catch (e) { return []; }
}

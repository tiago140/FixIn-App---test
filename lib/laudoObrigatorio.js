// Regra: toda ordem (chamado, orçamento ou reparo) só segue depois que o prestador assina o laudo de finalização.
// Ordens concluídas antes desta data ficam de fora, para não travar o que já estava em andamento.
export const LAUDO_DESDE = '2026-11-26T00:00:00Z';

export async function laudoAssinado(admin, os) {
  const { count } = await admin.from('os_laudos_finalizacao').select('id', { count: 'exact', head: true }).eq('os_id', os.id).eq('rodada', os.rodada || 0);
  return !!count;
}

// A ordem exige laudo? (as concluídas antes da regra não exigem)
export const exigeLaudo = (os) => !os.concluido_em || new Date(os.concluido_em) >= new Date(LAUDO_DESDE);

// Ordens do prestador com obra pronta (foto "depois" ou já concluída) e sem laudo assinado.
export async function pendenciasLaudo(admin, prestadorId) {
  const { data: ordens } = await admin.from('ordens_servico').select('id, numero, endereco, status, rodada, concluido_em').eq('prestador_id', prestadorId).in('status', ['em_execucao', 'reprovada', 'conclusao_pendente', 'aprovada', 'paga']).limit(200);
  const lista = (ordens || []).filter((o) => exigeLaudo(o));
  if (!lista.length) return [];
  const ids = lista.map((o) => o.id);
  const [{ data: laudos }, { data: depois }] = await Promise.all([
    admin.from('os_laudos_finalizacao').select('os_id, rodada').in('os_id', ids),
    admin.from('os_fotos').select('os_id, rodada').eq('tipo', 'depois').in('os_id', ids),
  ]);
  const tem = (arr, o) => (arr || []).some((x) => x.os_id === o.id && (x.rodada || 0) === (o.rodada || 0));
  return lista.filter((o) => !tem(laudos, o) && (['conclusao_pendente', 'aprovada', 'paga'].includes(o.status) || tem(depois, o)));
}

export const textoPendencias = (p) => `Antes de seguir, assine o laudo de finalização de: ${p.map((o) => o.numero).join(', ')}.`;

// Etapas do acompanhamento (sem dependências de servidor: pode ser usado no navegador).
export const ETAPAS = [
  { id: 'aprovado', label: 'Aprovado', pct: 0 },
  { id: 'iniciada', label: 'Obra iniciada', pct: 10 },
  { id: 'em_execucao', label: 'Em execução', pct: 50 },
  { id: 'aguardando_material', label: 'Aguardando material', pct: null },
  { id: 'concluida', label: 'Concluída', pct: 100 },
];
export const ETAPA_LABEL = Object.fromEntries(ETAPAS.map((e) => [e.id, e.label]));
export const ETAPA_COR = {
  aprovado: 'bg-info/15 text-info', iniciada: 'bg-info/15 text-info', em_execucao: 'bg-alerta/15 text-alerta',
  aguardando_material: 'bg-erro/10 text-erro', concluida: 'bg-sucesso/15 text-sucesso',
};

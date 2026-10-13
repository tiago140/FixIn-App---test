// Status e rótulos das ordens de serviço (sem dependências de servidor: pode ir para o navegador).
export const STATUS_OS = {
  enviada: { rotulo: 'Aguardando aceite', cor: 'bg-alerta/15 text-alerta' },
  aceita: { rotulo: 'Aceita — enviar valores', cor: 'bg-[#3B6B8C]/15 text-[#2c5570]' },
  recusada: { rotulo: 'Recusada', cor: 'bg-erro/15 text-erro' },
  orcada: { rotulo: 'Valores enviados', cor: 'bg-[#3B6B8C]/20 text-[#2c5570]' },
  aplicada: { rotulo: 'Em aprovação da imobiliária', cor: 'bg-[#3B6B8C]/20 text-[#2c5570]' },
  em_execucao: { rotulo: 'Em execução', cor: 'bg-sucesso/15 text-sucesso' },
  conclusao_pendente: { rotulo: 'Conclusão em análise', cor: 'bg-alerta/15 text-alerta' },
  aprovada: { rotulo: 'Concluída e aprovada', cor: 'bg-sucesso/15 text-sucesso' },
  reprovada: { rotulo: 'Reprovada — refazer', cor: 'bg-erro/15 text-erro' },
  paga: { rotulo: 'Paga', cor: 'bg-sucesso/20 text-sucesso' },
  cancelada: { rotulo: 'Cancelada', cor: 'bg-marinho/10 text-marinho/60' },
};

export const ORIGEM_OS = { visita: 'Visita', chamado: 'Chamado', orcamento: 'Orçamento aprovado', avulsa: 'Avulsa' };

export function totalItensOS(itens) {
  return (itens || []).reduce((s, i) => s + (Number(i.mo) || 0) + (Number(i.ma) || 0), 0);
}

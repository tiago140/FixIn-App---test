// Etapas da obra no app: Início (antes), Execução (durante) e Final (depois). Os valores guardados no banco continuam antes/durante/depois.
export const ETAPAS_FOTO = [['antes', 'Início'], ['durante', 'Execução'], ['depois', 'Final']];
export const ROTULO_ETAPA = { antes: 'Início', durante: 'Execução', depois: 'Final', reprovacao: 'Reprovado' };

// Passos da ordem, na visão do prestador. "ate" = índice do passo atual (0..6; 6 = tudo feito).
export const PASSOS_OS = ['Aceitar', 'Valores', 'Aprovação', 'Execução', 'Conclusão', 'Pagamento'];
const POSICAO = { enviada: 0, aceita: 1, orcada: 2, aplicada: 2, em_execucao: 3, reprovada: 3, conclusao_pendente: 4, aprovada: 5, paga: 6 };
const PROXIMO = {
  enviada: 'Aceite ou recuse a ordem.',
  aceita: 'Envie seus valores por item (mão de obra e material).',
  orcada: 'Aguarde: a FixIn está conferindo seus valores.',
  aplicada: 'Aguarde: o orçamento está com a imobiliária para aprovação.',
  em_execucao: 'Faça o serviço e envie as fotos: Início, Execução e Final.',
  reprovada: 'Leia o que a FixIn pediu, refaça e envie a conclusão de novo.',
  conclusao_pendente: 'Aguarde: a FixIn está conferindo suas fotos. Já pode anexar a nota fiscal.',
  aprovada: 'Serviço aprovado. Anexe a nota fiscal e aguarde o pagamento.',
  paga: 'Tudo certo, esta ordem está paga.',
};
export function posicaoOS(status) { return POSICAO[status] ?? null; }
export function proximoPassoOS(status) { return PROXIMO[status] || ''; }

// Situação do prazo: atrasado, vence logo (até 2 dias) ou ok. Só vale enquanto o serviço está aberto.
export function situacaoPrazo(prazo, status) {
  if (!prazo || !['aceita', 'orcada', 'aplicada', 'em_execucao', 'reprovada'].includes(status)) return null;
  const hoje = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  const dias = Math.round((new Date(prazo + 'T12:00:00') - new Date(hoje + 'T12:00:00')) / 86400000);
  const data = new Date(prazo + 'T12:00:00').toLocaleDateString('pt-BR');
  if (dias < 0) return { cor: 'erro', texto: `Prazo vencido em ${data}` };
  if (dias <= 2) return { cor: 'alerta', texto: dias === 0 ? 'Prazo: hoje' : `Prazo: ${data} (${dias} dia${dias > 1 ? 's' : ''})` };
  return { cor: 'marinho', texto: `Prazo: ${data}` };
}

// Quanto falta do cadastro para receber. Devolve { pct, faltam: [] }.
export function cadastroCompleto(p) {
  if (!p) return { pct: 0, faltam: [] };
  const doc = p.tipo_pessoa === 'pj' ? p.cnpj : p.cpf;
  const itens = [
    ['Telefone', p.telefone], ['CPF ou CNPJ', doc], ['Chave Pix', p.pix_chave],
    ['Conta bancária', p.banco && p.agencia && p.conta],
  ];
  const faltam = itens.filter(([, v]) => !String(v || '').trim()).map(([n]) => n);
  return { pct: Math.round(((itens.length - faltam.length) / itens.length) * 100), faltam };
}

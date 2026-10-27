// Pedidos de estorno (reembolso): textos e regras que valem na tela e no servidor.
export const STATUS_ESTORNO = {
  solicitado: { rotulo: 'Solicitado', cor: 'alerta', dica: 'Pedido enviado. A FixIn vai analisar.' },
  em_analise: { rotulo: 'Em análise', cor: 'info', dica: 'A FixIn está analisando o pedido.' },
  aprovado: { rotulo: 'Aprovado · a pagar', cor: 'sucesso', dica: 'Aprovado. O pagamento será feito na data combinada.' },
  recusado: { rotulo: 'Recusado', cor: 'erro', dica: 'Pedido recusado.' },
  pago: { rotulo: 'Pago', cor: 'sucesso', dica: 'Estorno pago.' },
};
export const PIX_TIPOS = { cpf: 'CPF', cnpj: 'CNPJ', email: 'E-mail', telefone: 'Telefone', aleatoria: 'Chave aleatória' };
export const COR_ESTORNO = {
  alerta: 'bg-alerta/15 text-alerta', info: 'bg-info/15 text-info', sucesso: 'bg-sucesso/15 text-sucesso', erro: 'bg-erro/10 text-erro',
};
export const VALOR_MAXIMO_ESTORNO = 10000000;

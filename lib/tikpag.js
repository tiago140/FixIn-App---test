// TikPag (cartão e outros meios). ESTRUTURA PRONTA, AGUARDANDO A DOCUMENTAÇÃO DO CHECKOUT.
// Quando a documentação chegar, só preenche-se criarCheckout() e confirmarPagamento() abaixo;
// o botão, as rotas, a cobrança no banco e o "No caixa" já estão ligados.
//
// Variáveis de ambiente esperadas (Vercel):
//   TIKPAG_API_KEY        chave/segredo da API
//   TIKPAG_API_URL        endereço base da API (sandbox ou produção)
//   TIKPAG_WEBHOOK_TOKEN  segredo para validar os avisos de pagamento
export function tikpagConfigurado() {
  return !!(process.env.TIKPAG_API_KEY && process.env.TIKPAG_API_URL);
}

// Deve devolver { externo_id, url } do checkout criado para este valor.
// entrada: { valor, descricao, referencia (id do lançamento), pagador: { nome, documento, email } }
export async function criarCheckout(entrada) { // eslint-disable-line no-unused-vars
  throw new Error('TikPag: integração aguardando a documentação do checkout.');
}

// Deve consultar a TikPag e devolver { pago: boolean, valor: number } para o id externo informado.
// (O sistema nunca confia só no aviso: sempre confere na API antes de dar baixa.)
export async function confirmarPagamento(externoId) { // eslint-disable-line no-unused-vars
  throw new Error('TikPag: integração aguardando a documentação do checkout.');
}

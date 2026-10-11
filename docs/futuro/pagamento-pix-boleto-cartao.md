# Ideia salva: escolher Pix, Boleto ou Cartão (TikPag) ao gerar a cobrança

Status: ideia aprovada pelo dono em 10/10/2026, ainda NÃO construída.
Desenho: `onde-ficam-os-botoes.png` (nesta pasta).

## Onde fica
Contas > A receber > cartão do orçamento > ao clicar em Entrada 50% / Saldo / 100%:
1. Quem paga (imobiliária ou outra pessoa com CPF/CNPJ) — já existe.
2. "Como vai pagar?" com três cartões: Pix, Boleto, Cartão.
3. Botão "Gerar link" e botão "Pague com o TikPag" (com o logo da TikPag).

## Hoje
- Existe um único botão "Gerar link (Pix, boleto ou cartão)": o link do Asaas já deixa o pagador escolher.
- O botão "Pague com o TikPag" já existe, desativado ("em breve"), e a estrutura está pronta:
  `lib/tikpag.js`, `app/api/lancamentos/[id]/tikpag/route.js`, `app/api/webhooks/tikpag/route.js`.
- Logo: colocar o PNG transparente em `public/tikpag-logo.png` (sem ele aparece o nome em texto).

## Para decidir na integração
- Pix e Boleto como escolhas separadas (Asaas `billingType` = PIX ou BOLETO) ou continuar com link único (UNDEFINED).
- A TikPag talvez exija gerar um boleto para o pagamento: nesse caso o botão do TikPag cria boleto + checkout juntos.
- Cartão: à vista ou parcelado; repasse da TikPag em D0 ou D1; taxa paga por quem paga (informado pelo dono).

## O que falta para ligar a TikPag
1. Documentação do checkout (endereço da API teste/produção, criar checkout, consultar pagamento, webhook e como validá-lo).
2. Chave da API de teste (guardar na Vercel: TIKPAG_API_KEY, TIKPAG_API_URL, TIKPAG_WEBHOOK_TOKEN).
3. Logo da TikPag em PNG com fundo transparente.
4. Preencher `criarCheckout()` e `confirmarPagamento()` em `lib/tikpag.js` e o webhook.

# FixIn Reformas — Sistema de Orçamentos (v2)

Sistema completo de orçamentos com login por setor, prestadores, visitas com
aprovação, financeiro detalhado, avisos automáticos, chat com anexos e
solicitação de orçamento pelo lado da imobiliária.

## Estado atual

✅ O banco de dados **já está criado e configurado** no seu projeto Supabase conectado
(tabelas, segurança, funções, buckets de arquivo — tudo aplicado).
Só falta: criar sua conta de dono, configurar as variáveis de ambiente, e publicar na Vercel.

## Passo 1 — Pegar as chaves do Supabase

No painel do Supabase → Project Settings → API, copie:
- Project URL
- anon public key
- service_role key (fica em "Reveal" — nunca compartilhe)

## Passo 2 — Criar sua conta de dono (master)

1. No Supabase → Authentication → Users → **Add user**, crie seu login com e-mail e senha.
2. Copie o **UID** desse usuário.
3. Vá em Table Editor → **profiles** → Insert row:
   - `id`: o UID copiado
   - `role`: `master`
   - `nome_completo`: seu nome
   - `email`: seu e-mail

## Passo 3 — Variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha com os valores do Passo 1.
`RESEND_API_KEY` pode ficar em branco por enquanto (o sistema funciona, só não manda e-mail automático).

## Passo 4 — Rodar localmente (opcional)

```
npm install
npm run dev
```

## Passo 5 — Publicar na Vercel

1. Suba este código para um repositório no GitHub.
2. Na Vercel, "Add New Project", importe o repositório.
3. Em "Environment Variables", adicione as mesmas do `.env.local`.
4. Deploy.

## O que tem nesta versão

**Painel do dono (master)**
- Painel geral com aviso de pendências
- Kanban (Pendente → Em preparação → Enviado → Aprovado → Em execução → Finalizado, + Rejeitado)
- Avisos automáticos de atraso de pagamento e visitas aguardando aprovação (dispensáveis com um clique)
- Financeiro completo: por tipo de serviço, por imobiliária, margem interna da FixIn (nunca exposta à imobiliária)
- Prestadores: cadastro (nome, RG, CPF, telefone), atribuição ao orçamento, controle de pagamento (aguardando/entrada paga/pago integral)
- Visitas: agenda com calendário mensal, cria já confirmada, ou aprova solicitações da imobiliária
- Clientes, Acessos (com setor admin/operacional), Catálogo de itens

**Painel da imobiliária**
- Solicita orçamento ou manutenção sem poder definir preço/margem (fica com você)
- Vê Kanban, Financeiro e Avisos — só dos próprios orçamentos, somente leitura
- Solicita visita (fica pendente até você confirmar)
- Setor Administrador pode criar outros usuários (Operacional só solicita/acompanha/usa o chat)
- Chat com anexo de foto/PDF por orçamento

**PDF do orçamento**
- Fonte Poppins embutida de verdade no arquivo
- MO e MA mostrados por item, já com a margem aplicada dentro dos dois valores (nunca exposta)
- Total sempre ancorado perto do rodapé da última página

## O que ainda não está incluído

- Envio automático por WhatsApp (precisa decidir API oficial Meta ou Twilio)
- Emissão real de Nota Fiscal (o sistema só guarda e organiza o arquivo que você já gerou em outro lugar)
- Notificação push/e-mail de verdade fora do "Gerar PDF" (avisos de atraso e visita ficam só dentro do próprio sistema)

## Estrutura

```
app/
  login/                     tela de login
  master/                    painel do dono
  imobiliaria/                painel da imobiliária
  api/                        rotas de servidor
lib/
  gerarPdfOrcamento.js       gerador do PDF (Poppins, margem embutida, total no rodapé)
  parseVistoria.js           leitura do PDF de vistoria
  format.js                  status, cálculo de totais, detecção de atraso
supabase/
  schema.sql                 schema completo (referência — já aplicado no seu projeto)
```

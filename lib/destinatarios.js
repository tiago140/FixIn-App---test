// Quem recebe os e-mails de um orçamento, sempre pelos usuários cadastrados no sistema:
//  - o ADMINISTRADOR da imobiliária recebe TODOS os orçamentos da imobiliária;
//  - o OPERACIONAL recebe só os orçamentos que ELE MESMO solicitou (quem criou o pedido).
// Só pessoas ativas. Se não houver nenhum e-mail de usuário, cai para o e-mail do cadastro da imobiliária.
// soAdmins = true para mensagens com valores financeiros (pendência de pagamento).
export async function destinatariosDoOrcamento(client, orcamentoId, { soAdmins = false } = {}) {
  const { data: orc } = await client.from('orcamentos').select('cliente_id, criado_por, clientes(email)').eq('id', orcamentoId).maybeSingle();
  if (!orc) return { emails: [], origem: 'orcamento_nao_encontrado' };

  const { data: pessoas } = await client.from('profiles').select('id, email, subrole, ativo').eq('cliente_id', orc.cliente_id).eq('role', 'imobiliaria');
  const ativos = (pessoas || []).filter((p) => p.ativo !== false && p.email);
  const admins = ativos.filter((p) => p.subrole == null || p.subrole === 'admin');
  const solicitante = ativos.find((p) => p.id === orc.criado_por);

  const escolhidos = soAdmins ? admins : [...admins, ...(solicitante ? [solicitante] : [])];
  let emails = [...new Set(escolhidos.map((p) => String(p.email).trim().toLowerCase()))];
  let origem = 'usuarios';
  if (emails.length === 0 && orc.clientes?.email) {
    emails = [String(orc.clientes.email).trim().toLowerCase()];
    origem = 'cadastro_da_imobiliaria';
  }
  return { emails, origem, solicitante: solicitante?.email || null };
}

// Laudo de inspeção não é de uma pessoa só: vai para os administradores da imobiliária. Se estiver ligado a um orçamento, para os mesmos do orçamento.
export async function destinatariosDoCliente(client, clienteId, { orcamentoId = null } = {}) {
  if (orcamentoId) return destinatariosDoOrcamento(client, orcamentoId);
  const { data: pessoas } = await client.from('profiles').select('id, email, subrole, ativo').eq('cliente_id', clienteId).eq('role', 'imobiliaria');
  const admins = (pessoas || []).filter((p) => p.ativo !== false && p.email && (p.subrole == null || p.subrole === 'admin'));
  let emails = [...new Set(admins.map((p) => String(p.email).trim().toLowerCase()))];
  let origem = 'usuarios';
  if (emails.length === 0) {
    const { data: cli } = await client.from('clientes').select('email').eq('id', clienteId).maybeSingle();
    if (cli?.email) { emails = [String(cli.email).trim().toLowerCase()]; origem = 'cadastro_da_imobiliaria'; }
  }
  return { emails, origem };
}

// Cliente mínimo do Asaas. Só roda no servidor (usa a chave secreta).
// ASAAS_AMBIENTE = 'sandbox' (teste, dinheiro de mentira) ou 'producao'.
export function asaasBase() {
  return process.env.ASAAS_AMBIENTE === 'producao' ? 'https://api.asaas.com/v3' : 'https://api-sandbox.asaas.com/v3';
}

export function asaasConfigurado() {
  return !!process.env.ASAAS_API_KEY;
}

export async function asaas(caminho, { method = 'GET', body } = {}) {
  const r = await fetch(asaasBase() + caminho, {
    method,
    headers: { 'Content-Type': 'application/json', access_token: process.env.ASAAS_API_KEY, 'User-Agent': 'FixIn-Reformas' },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = j?.errors?.[0]?.description || `Asaas respondeu ${r.status}`;
    const e = new Error(msg); e.status = r.status; throw e;
  }
  return j;
}

// Garante que a imobiliária exista como cliente no Asaas e devolve o id dela.
export async function garantirClienteAsaas(admin, cliente) {
  if (cliente.asaas_customer_id) return cliente.asaas_customer_id;
  const doc = String(cliente.cnpj || '').replace(/\D/g, '');
  if (doc.length !== 14 && doc.length !== 11) throw new Error('Cadastre o CNPJ da imobiliária antes de gerar a cobrança.');
  const c = await asaas('/customers', { method: 'POST', body: { name: cliente.nome_empresa || cliente.nome, cpfCnpj: doc, email: cliente.email || undefined, notificationDisabled: true, externalReference: cliente.id } });
  await admin.from('clientes').update({ asaas_customer_id: c.id }).eq('id', cliente.id);
  return c.id;
}

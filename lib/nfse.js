// Nota fiscal de serviço (NFS-e) pelo Asaas.
// REGRA DA FIXIN: a NFS-e é só da MÃO DE OBRA. O material sai em NF-e de produto, pedida à parte (justificativa).
import { asaas, asaasConfigurado } from '@/lib/asaas';
import { arredondarParaCima } from '@/lib/format';

const soDig = (s) => String(s ?? '').replace(/\D/g, '');
const dia = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
export const STATUS_NF = {
  SCHEDULED: 'Agendada', SYNCHRONIZED: 'Na prefeitura (aguardando)', AUTHORIZED: 'Emitida', ERROR: 'Erro', ERRO: 'Erro',
  PROCESSING_CANCELLATION: 'Cancelando', CANCELED: 'Cancelada', CANCELLATION_DENIED: 'Cancelamento negado',
};

// Mão de obra e material do orçamento, já com a margem (mesma conta do total do orçamento).
export function valoresMoMa(itens, margemPercentual) {
  const fator = 1 + (Number(margemPercentual) || 0) / 100;
  let mo = 0, ma = 0;
  for (const it of itens || []) { mo += arredondarParaCima((Number(it.mo) || 0) * fator); ma += arredondarParaCima((Number(it.ma) || 0) * fator); }
  return { mo, ma, total: mo + ma };
}

function impostos(c) {
  const t = { retainIss: !!c.nf_retem_iss, iss: Number(c.nf_iss || 0), cofins: Number(c.nf_cofins || 0), csll: Number(c.nf_csll || 0), inss: Number(c.nf_inss || 0), ir: Number(c.nf_ir || 0), pis: Number(c.nf_pis || 0) };
  const cod = (v) => String(v ?? '').trim();
  if (cod(c.nf_nbs)) t.nbsCode = cod(c.nf_nbs); // como digitado, COM os pontos
  if (cod(c.nf_cst)) t.taxSituationCode = cod(c.nf_cst);
  if (cod(c.nf_class_trib)) t.taxClassificationCode = cod(c.nf_class_trib);
  if (cod(c.nf_ind_op)) t.operationIndicatorCode = cod(c.nf_ind_op);
  return t;
}

// Se o Asaas recusar o NBS, tenta outros formatos e por último sem NBS. A recusa vem antes de a nota existir: não duplica.
async function criarNota(corpo) {
  const nbs = String(corpo?.taxes?.nbsCode || '');
  const post = (b) => asaas('/invoices', { method: 'POST', body: b });
  if (!nbs) return post(corpo);
  const d = nbs.replace(/\D/g, '');
  const pontos = d.length === 9 ? `${d[0]}.${d.slice(1, 5)}.${d.slice(5, 7)}.${d.slice(7)}` : nbs;
  let ultimo = null;
  for (const f of [...new Set([nbs, pontos, d, ''])]) {
    const taxes = { ...corpo.taxes }; if (f) taxes.nbsCode = f; else delete taxes.nbsCode;
    try { return await post({ ...corpo, taxes }); } catch (e) { ultimo = e; if (!/NBS/i.test(String(e?.message || e))) throw e; }
  }
  throw ultimo;
}

async function clienteDaNota(t) {
  const doc = soDig(t.cpf_cnpj);
  if (doc.length !== 11 && doc.length !== 14) throw new Error('CPF ou CNPJ do tomador inválido.');
  const dados = { name: t.nome, cpfCnpj: doc, email: t.email || undefined, mobilePhone: soDig(t.telefone) || undefined, postalCode: soDig(t.cep) || undefined, address: t.endereco || undefined, addressNumber: t.numero || undefined, complement: t.complemento || undefined, province: t.bairro || undefined, notificationDisabled: true };
  const achado = await asaas('/customers?cpfCnpj=' + doc);
  const id = achado?.data?.[0]?.id;
  if (id) { await asaas('/customers/' + id, { method: 'POST', body: dados }); return id; }
  return (await asaas('/customers', { method: 'POST', body: dados })).id;
}

export function validarTomador(t) {
  const doc = soDig(t?.cpf_cnpj);
  if (!String(t?.nome || '').trim()) return 'Informe o nome do tomador.';
  if (doc.length !== 11 && doc.length !== 14) return 'CPF ou CNPJ do tomador inválido.';
  if (soDig(t?.cep).length !== 8 || !String(t?.endereco || '').trim() || !String(t?.numero || '').trim()) return 'Falta o endereço do tomador (CEP, rua e número).';
  return null;
}

// Pede a nota ao Asaas e já manda autorizar. O resultado final chega pelo webhook (ou pelo botão Atualizar).
export async function emitirNota(admin, cfg, reg) {
  if (!asaasConfigurado()) throw new Error('Falta a chave do Asaas.');
  if (!cfg?.nf_ativo) throw new Error('Nota fiscal desligada em Configurações.');
  if (!cfg.nf_servico_nome || (!cfg.nf_servico_id && !cfg.nf_servico_codigo)) throw new Error('Configure o serviço da nota fiscal.');
  const t = reg.tomador || {};
  const erroT = validarTomador(t); if (erroT) throw new Error(erroT);
  const valor = Math.round(Number(reg.valor) * 100) / 100;
  if (!(valor > 0)) throw new Error('Informe o valor da nota.');
  const corpo = {
    customer: await clienteDaNota(t),
    serviceDescription: String(reg.descricao || '').slice(0, 1000), observations: reg.obs || cfg.nf_obs || '',
    value: valor, deductions: 0, effectiveDate: dia(), municipalServiceName: cfg.nf_servico_nome,
    externalReference: 'nf|' + reg.id, taxes: impostos(cfg),
  };
  if (cfg.nf_servico_id) corpo.municipalServiceId = cfg.nf_servico_id;
  else { corpo.municipalServiceId = null; corpo.municipalServiceCode = cfg.nf_servico_codigo; }

  const n = await criarNota(corpo);
  let st = n.status;
  try { const a = await asaas(`/invoices/${n.id}/authorize`, { method: 'POST' }); st = a.status || st; } catch (e) { /* fica agendada para hoje */ }
  const agora = new Date().toISOString();
  const nf = { id: n.id, status: st, criado_em: agora, pdf: n.pdfUrl || null, numero: n.number || null, valor, historico: [...(reg.nota_fiscal?.historico || []), { em: agora, ev: 'NOTA_PEDIDA' }].slice(-30) };
  await admin.from('notas_fiscais').update({ nota_fiscal: nf, atualizado: agora }).eq('id', reg.id);
  return nf;
}

// Aplica uma resposta do Asaas (webhook ou consulta) no registro.
export async function aplicarNotaDoAsaas(admin, reg, inv, evento) {
  const nf = reg.nota_fiscal || {}; const agora = new Date().toISOString();
  const novo = { ...nf, status: inv.status, pdf: inv.pdfUrl || nf.pdf || null, xml: inv.xmlUrl || nf.xml || null, numero: inv.number || nf.numero || null, erro: inv.statusDescription || null, atualizado: agora, historico: [...(nf.historico || []), { em: agora, ev: evento }].slice(-30) };
  await admin.from('notas_fiscais').update({ nota_fiscal: novo, atualizado: agora }).eq('id', reg.id);
  return novo;
}

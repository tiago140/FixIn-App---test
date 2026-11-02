// Junta os registros da auditoria em "feito" e "enviado" por orçamento.
// feito  = alguém gerou o PDF (com ou sem e-mail) ou enviou; enviado = "Enviou orçamento (PDF e e-mail)".
export const ACOES_FEITO = ['Gerou PDF (sem enviar e-mail)', 'Gerou PDF do orçamento (sem e-mail)', 'Gerou Orçamento 2 (PDF)', 'Enviou orçamento (PDF e e-mail)'];
export const ACAO_ENVIADO = 'Enviou orçamento (PDF e e-mail)';

// eventos: [{ alvo_id, acao, autor_id, autor_nome, criado_em }] → Map(orcamento_id → { feitoEm, feitoPor, feitoPorId, enviadoEm, enviadoPor, enviadoPorId })
export function resumirEventos(eventos) {
  const m = new Map();
  const ord = [...(eventos || [])].sort((a, b) => new Date(a.criado_em) - new Date(b.criado_em));
  for (const e of ord) {
    if (!e.alvo_id) continue;
    const r = m.get(e.alvo_id) || {};
    if (!r.feitoEm) { r.feitoEm = e.criado_em; r.feitoPor = e.autor_nome; r.feitoPorId = e.autor_id; }
    if (e.acao === ACAO_ENVIADO) { r.enviadoEm = e.criado_em; r.enviadoPor = e.autor_nome; r.enviadoPorId = e.autor_id; }
    m.set(e.alvo_id, r);
  }
  return m;
}

// Contagem por pessoa: quantos orçamentos cada uma fez (gerou PDF) e enviou no período.
export function contarPorPessoa(resumos) {
  const c = new Map();
  for (const r of resumos.values()) {
    if (r.feitoPorId) { const x = c.get(r.feitoPorId) || { nome: r.feitoPor, feitos: 0, enviados: 0 }; x.feitos++; c.set(r.feitoPorId, x); }
    if (r.enviadoPorId) { const x = c.get(r.enviadoPorId) || { nome: r.enviadoPor, feitos: 0, enviados: 0 }; x.enviados++; c.set(r.enviadoPorId, x); }
  }
  return [...c.entries()].map(([id, v]) => ({ id, ...v })).sort((a, b) => b.enviados - a.enviados || b.feitos - a.feitos);
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SolicitarOrcamentoForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    tipo: 'rescisao',
    endereco: '',
    descricao: '',
    nome_cliente_final: '',
    cpf_cliente_final: '',
    cnpj_cliente_final: '',
  });
  const [itens, setItens] = useState([]);
  const [vistoriaTexto, setVistoriaTexto] = useState('');
  const [avisoVistoria, setAvisoVistoria] = useState('');
  const [lendoVistoria, setLendoVistoria] = useState(false);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleVistoria(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLendoVistoria(true);
    setAvisoVistoria('Lendo PDF…');
    const fd = new FormData();
    fd.append('arquivo', file);
    try {
      const res = await fetch('/api/vistoria/parse', { method: 'POST', body: fd });
      const data = await res.json();
      setLendoVistoria(false);
      if (!res.ok) {
        setAvisoVistoria(data.error || 'Erro ao ler PDF');
        return;
      }
      setItens((atual) => [...atual, ...(data.itens || [])]);
      setVistoriaTexto(data.texto_bruto || '');
      if (data.endereco && !form.endereco.trim()) {
        setForm((f) => ({ ...f, endereco: data.endereco }));
      }
      setAvisoVistoria(
        (data.resumo || (data.itens?.length ? `${data.itens.length} item(ns) identificado(s) na vistoria.` : 'Não reconheci itens automaticamente neste PDF — sem problema, a FixIn completa manualmente.')) +
        (data.endereco && !form.endereco.trim() ? '\nEndereço preenchido automaticamente.' : '')
      );
    } catch (err) {
      setLendoVistoria(false);
      setAvisoVistoria('Erro ao ler PDF: ' + err.message);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErro('');
    setSalvando(true);
    const res = await fetch('/api/orcamentos/solicitar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, itens, vistoria_texto_bruto: vistoriaTexto || null }),
    });
    setSalvando(false);
    const data = await res.json();
    if (!res.ok) {
      setErro(data.error || 'Erro ao enviar');
      return;
    }
    router.push('/imobiliaria/dashboard');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-16">
      {erro && <div className="text-sm bg-erro/10 border border-erro text-erro px-3 py-2 rounded">{erro}</div>}

      <div className="card p-5 space-y-4">
        <div>
          <label className="block text-xs text-marinho/60 mb-1">Tipo de solicitação</label>
          <select value={form.tipo} onChange={set('tipo')} className="w-full border border-linha rounded px-3 py-2 bg-papel">
            <option value="rescisao">Rescisão / desocupação</option>
            <option value="manutencao">Manutenção (contrato ativo)</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-marinho/60 mb-1">Endereço do imóvel</label>
          <input value={form.endereco} onChange={set('endereco')} required className="w-full border border-linha rounded px-3 py-2 bg-papel" />
        </div>
        <div>
          <label className="block text-xs text-marinho/60 mb-1">Descreva o que precisa</label>
          <textarea value={form.descricao} onChange={set('descricao')} rows={4} placeholder="Conte o que está acontecendo ou o que precisa ser orçado" className="w-full border border-linha rounded px-3 py-2 bg-papel" />
        </div>
      </div>

      <div className="card p-5">
        <h3 className="font-semibold text-sm mb-2">Vistoria de saída (opcional)</h3>
        <p className="text-xs text-marinho/50 mb-3">Suba o PDF da vistoria — a gente já lista os ambientes e serviços pra FixIn. Ela só precisa preencher os valores.</p>
        <label className="inline-block border border-dashed border-linha rounded px-4 py-2 text-sm cursor-pointer text-marinho/70">
          {lendoVistoria ? 'Lendo…' : 'Selecionar PDF da vistoria'}
          <input type="file" accept="application/pdf" onChange={handleVistoria} disabled={lendoVistoria} className="hidden" />
        </label>
        {avisoVistoria && <div className="text-xs text-marinho/60 mt-2 whitespace-pre-line">{avisoVistoria}</div>}
        {itens.length > 0 && (
          <div className="text-xs text-marinho/50 mt-2">
            {itens.length} item(ns) já identificado(s): {itens.map((it) => `${it.ambiente} — ${it.servico}`).join(', ')}
          </div>
        )}
      </div>

      <div className="card p-5 space-y-4">
        <h3 className="font-semibold text-sm">Dados do cliente final (para NF/boleto, quando necessário)</h3>
        <div>
          <label className="block text-xs text-marinho/60 mb-1">Nome completo</label>
          <input value={form.nome_cliente_final} onChange={set('nome_cliente_final')} className="w-full border border-linha rounded px-3 py-2 bg-papel" />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-marinho/60 mb-1">CPF</label>
            <input value={form.cpf_cliente_final} onChange={set('cpf_cliente_final')} className="w-full border border-linha rounded px-3 py-2 bg-papel" />
          </div>
          <div>
            <label className="block text-xs text-marinho/60 mb-1">CNPJ (se aplicável)</label>
            <input value={form.cnpj_cliente_final} onChange={set('cnpj_cliente_final')} className="w-full border border-linha rounded px-3 py-2 bg-papel" />
          </div>
        </div>
      </div>

      <div className="text-xs text-marinho/50">Os valores do orçamento são definidos pela FixIn depois da análise — você não precisa preencher preços.</div>

      <button disabled={salvando} className="w-full bg-verde text-white rounded py-3 font-semibold disabled:opacity-50">
        {salvando ? 'Enviando…' : 'Enviar solicitação'}
      </button>
    </form>
  );
}


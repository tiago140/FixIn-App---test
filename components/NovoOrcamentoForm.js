'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { fmtBRL, calcularTotalItens, calcularTotalComMargem } from '@/lib/format';
import EditorItensOrcamento from '@/components/EditorItensOrcamento';

let uidCounter = 0;
function novoId() {
  uidCounter += 1;
  return 'novo-' + uidCounter + '-' + Date.now();
}

export default function NovoOrcamentoForm({ clientes, catalogo, tipoInicial, enderecoInicial, clienteIdInicial }) {
  const router = useRouter();

  const [tipo, setTipo] = useState(tipoInicial || 'rescisao');
  const [clienteId, setClienteId] = useState(clienteIdInicial || clientes?.[0]?.id || '');
  const [endereco, setEndereco] = useState(enderecoInicial || '');
  const [validadeDias, setValidadeDias] = useState(30);
  const [prazoExecucao, setPrazoExecucao] = useState('');
  const [garantia, setGarantia] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('Pix ou Transferência: à vista');
  const [nomeClienteFinal, setNomeClienteFinal] = useState('');
  const [cpfClienteFinal, setCpfClienteFinal] = useState('');
  const [cnpjClienteFinal, setCnpjClienteFinal] = useState('');
  const [margem, setMargem] = useState(20);
  const [margemCustom, setMargemCustom] = useState('');
  const [itens, setItens] = useState([]);
  const [vistoriaTexto, setVistoriaTexto] = useState('');
  const [enviandoVistoria, setEnviandoVistoria] = useState(false);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [avisoVistoria, setAvisoVistoria] = useState('');

  const margemEfetiva = margem === 'custom' ? Number(margemCustom) || 0 : Number(margem);
  const totalBase = useMemo(() => calcularTotalItens(itens), [itens]);
  const totalFinal = useMemo(() => calcularTotalComMargem(itens, margemEfetiva), [itens, margemEfetiva]);

  async function handleUploadVistoria(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setEnviandoVistoria(true);
    setAvisoVistoria('');
    setErro('');

    const fd = new FormData();
    fd.append('arquivo', file);

    try {
      const res = await fetch('/api/vistoria/parse', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.error || 'Erro ao ler o PDF da vistoria');
        return;
      }
      setVistoriaTexto(data.texto_bruto || '');
      const enderecoPreenchido = !!(data.endereco && !endereco.trim());
      if (enderecoPreenchido) setEndereco(data.endereco);
      const novosItens = (data.itens || []).map((it) => ({ ...it, id: novoId() }));
      setItens((lista) => [...lista, ...novosItens]);
      setAvisoVistoria(
        (data.resumo || `${novosItens.length} item(ns) extraído(s) da vistoria.`) +
          (enderecoPreenchido ? '\nEndereço do imóvel preenchido automaticamente pela vistoria.' : '') +
          (novosItens.length > 0 ? '\nOs itens vieram sem preço: use "Gerar valores com IA" logo abaixo da lista de itens, ou preencha à mão.' : '')
      );
    } finally {
      setEnviandoVistoria(false);
      e.target.value = '';
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErro('');

    if (itens.length === 0 && tipo !== 'manutencao') {
      setErro('Adicione pelo menos um item ao orçamento.');
      return;
    }

    setSalvando(true);
    const res = await fetch('/api/orcamentos/criar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cliente_id: clienteId,
        endereco,
        tipo,
        validade_dias: Number(validadeDias) || 30,
        prazo_execucao_dias: prazoExecucao ? Number(prazoExecucao) : null,
        garantia,
        forma_pagamento: formaPagamento,
        nome_cliente_final: nomeClienteFinal,
        cpf_cliente_final: cpfClienteFinal,
        cnpj_cliente_final: cnpjClienteFinal,
        margem_percentual: margemEfetiva,
        vistoria_texto_bruto: vistoriaTexto || null,
        itens,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setSalvando(false);
      setErro(data.error || 'Erro ao salvar orçamento');
      return;
    }
    // Já gera o PDF no padrão FixIn (só gera e guarda: NÃO manda e-mail e NÃO muda a etapa — o envio ao cliente
    // continua sendo um passo consciente, no botão "Gerar PDF e enviar por e-mail" do orçamento).
    // Manutenção sem itens ainda não tem o que mostrar num PDF.
    if (itens.length > 0) {
      try { await fetch(`/api/orcamentos/${data.orcamento.id}/pdf?enviar=0&manter=1`, { method: 'POST' }); } catch (e) {}
    }
    setSalvando(false);
    router.push(`/master/orcamentos/${data.orcamento.id}`);
    router.refresh();
  }

  if (!clientes || clientes.length === 0) {
    return (
      <div className="border border-dashed border-linha p-8 text-center text-marinho/50">
        Cadastre uma imobiliária antes de criar um orçamento.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-16">
      {erro && <div className="text-sm bg-erro/10 border border-erro text-erro px-3 py-2 rounded">{erro}</div>}

      <div className="card p-5 space-y-4">
        <div>
          <label className="block text-xs text-marinho/60 mb-1">Tipo de solicitação</label>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="w-full border border-linha rounded px-3 py-2 bg-papel">
            <option value="rescisao">Rescisão / desocupação</option>
            <option value="manutencao">Manutenção (contrato ativo)</option>
          </select>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-marinho/60 mb-1">Imobiliária</label>
            <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className="w-full border border-linha rounded px-3 py-2 bg-papel">
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>{c.nome_empresa}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-marinho/60 mb-1">Endereço do imóvel</label>
            <input value={endereco} onChange={(e) => setEndereco(e.target.value)} required className="w-full border border-linha rounded px-3 py-2 bg-papel" />
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-marinho/60 mb-1">Validade (dias)</label>
            <input type="number" value={validadeDias} onChange={(e) => setValidadeDias(e.target.value)} className="w-full border border-linha rounded px-3 py-2 bg-papel" />
          </div>
          <div>
            <label className="block text-xs text-marinho/60 mb-1">Prazo estimado de execução (dias)</label>
            <input type="number" value={prazoExecucao} onChange={(e) => setPrazoExecucao(e.target.value)} className="w-full border border-linha rounded px-3 py-2 bg-papel" />
          </div>
          <div>
            <label className="block text-xs text-marinho/60 mb-1">Forma de pagamento</label>
            <input value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value)} className="w-full border border-linha rounded px-3 py-2 bg-papel" />
          </div>
        </div>

        <div>
          <label className="block text-xs text-marinho/60 mb-1">Garantia (texto livre, avalie caso a caso)</label>
          <textarea value={garantia} onChange={(e) => setGarantia(e.target.value)} rows={2} className="w-full border border-linha rounded px-3 py-2 bg-papel" placeholder="Ex: 90 dias para serviços de pintura, 30 dias para reparos hidráulicos." />
        </div>
      </div>

      <div className="card p-5 space-y-4">
        <h3 className="font-semibold text-sm">Dados do cliente final (para NF/boleto, quando necessário)</h3>
        <div>
          <label className="block text-xs text-marinho/60 mb-1">Nome completo</label>
          <input value={nomeClienteFinal} onChange={(e) => setNomeClienteFinal(e.target.value)} className="w-full border border-linha rounded px-3 py-2 bg-papel" />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-marinho/60 mb-1">CPF</label>
            <input value={cpfClienteFinal} onChange={(e) => setCpfClienteFinal(e.target.value)} className="w-full border border-linha rounded px-3 py-2 bg-papel" />
          </div>
          <div>
            <label className="block text-xs text-marinho/60 mb-1">CNPJ (se aplicável)</label>
            <input value={cnpjClienteFinal} onChange={(e) => setCnpjClienteFinal(e.target.value)} className="w-full border border-linha rounded px-3 py-2 bg-papel" />
          </div>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm">Vistoria de saída (opcional)</h3>
        </div>
        <p className="text-xs text-marinho/50 mb-3">Envie o PDF da vistoria e o sistema tenta extrair os itens automaticamente.</p>
        <label className="inline-block border border-dashed border-linha rounded px-4 py-2 text-sm cursor-pointer text-marinho/70">
          {enviandoVistoria ? 'Lendo PDF…' : 'Selecionar PDF da vistoria'}
          <input type="file" accept="application/pdf" onChange={handleUploadVistoria} disabled={enviandoVistoria} className="hidden" />
        </label>
        {avisoVistoria && <div className="text-xs text-marinho/60 mt-2 whitespace-pre-line">{avisoVistoria}</div>}
      </div>

      <EditorItensOrcamento itens={itens} setItens={setItens} endereco={endereco} catalogo={catalogo} />

      <div className="card p-5">
        <h3 className="font-semibold text-sm mb-3">Margem da FixIn (embutida, invisível para a imobiliária)</h3>
        <div className="flex gap-2 flex-wrap">
          {[20, 30, 40].map((m) => (
            <button
              type="button"
              key={m}
              onClick={() => setMargem(m)}
              className={`px-4 py-1.5 rounded text-sm border ${margem === m ? 'bg-marinho text-white border-marinho' : 'border-linha text-marinho/70'}`}
            >
              {m}%
            </button>
          ))}
          <button
            type="button"
            onClick={() => setMargem('custom')}
            className={`px-4 py-1.5 rounded text-sm border ${margem === 'custom' ? 'bg-marinho text-white border-marinho' : 'border-linha text-marinho/70'}`}
          >
            Outro
          </button>
          {margem === 'custom' && (
            <input
              type="number"
              value={margemCustom}
              onChange={(e) => setMargemCustom(e.target.value)}
              placeholder="%"
              className="w-20 border border-linha rounded px-2 py-1.5 bg-papel text-sm"
            />
          )}
        </div>

        <div className="mt-4 flex justify-between text-sm text-marinho/60">
          <span>Custo base (MO + MA)</span>
          <span className="font-mono">{fmtBRL(totalBase)}</span>
        </div>
        <div className="flex justify-between text-lg font-semibold mt-1">
          <span>Total do orçamento</span>
          <span className="font-mono">{fmtBRL(totalFinal)}</span>
        </div>
      </div>

      <button disabled={salvando} className="w-full bg-verde text-white rounded py-3 font-semibold disabled:opacity-50">
        {salvando ? 'Salvando e gerando o PDF…' : tipo === 'manutencao' ? 'Criar solicitação' + (itens.length > 0 ? ' e gerar PDF' : '') : 'Criar orçamento e gerar PDF'}
      </button>
    </form>
  );
}

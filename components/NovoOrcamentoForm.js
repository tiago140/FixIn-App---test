'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { fmtBRL, calcularTotalItens, calcularTotalComMargem } from '@/lib/format';

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
  const [catalogoSelecionado, setCatalogoSelecionado] = useState(catalogo?.[0]?.id || '');
  const [enviandoVistoria, setEnviandoVistoria] = useState(false);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [avisoVistoria, setAvisoVistoria] = useState('');
  const [descricaoIA, setDescricaoIA] = useState('');
  const [gerandoIA, setGerandoIA] = useState(false);
  const [avisoIA, setAvisoIA] = useState('');

  const margemEfetiva = margem === 'custom' ? Number(margemCustom) || 0 : Number(margem);
  const totalBase = useMemo(() => calcularTotalItens(itens), [itens]);
  const totalFinal = useMemo(() => calcularTotalComMargem(itens, margemEfetiva), [itens, margemEfetiva]);

  function atualizarItem(id, campo, valor) {
    setItens((lista) => lista.map((it) => (it.id === id ? { ...it, [campo]: valor } : it)));
  }

  function removerItem(id) {
    setItens((lista) => lista.filter((it) => it.id !== id));
  }

  function adicionarItemManual() {
    setItens((lista) => [...lista, { id: novoId(), ambiente: '', servico: '', descricao: '', mo: 0, ma: 0 }]);
  }

  function adicionarDoCatalogo() {
    const item = (catalogo || []).find((c) => c.id === catalogoSelecionado);
    if (!item) return;
    setItens((lista) => [
      ...lista,
      { id: novoId(), ambiente: item.ambiente, servico: item.servico, descricao: '', mo: item.mo_padrao, ma: item.ma_padrao },
    ]);
  }

  async function handleGerarIA() {
    if (!descricaoIA.trim()) {
      setAvisoIA('Descreva o que precisa ser feito antes de gerar.');
      return;
    }
    setGerandoIA(true);
    setAvisoIA('');
    setErro('');
    try {
      const res = await fetch('/api/orcamentos/gerar-ia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descricao: descricaoIA, endereco }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAvisoIA(data.error || 'Erro ao gerar itens com IA');
        return;
      }
      const novosItens = (data.itens || []).map((it) => ({ ...it, id: novoId() }));
      setItens((lista) => [...lista, ...novosItens]);
      setAvisoIA(
        novosItens.length > 0
          ? `${novosItens.length} item(ns) gerado(s) pela IA com base na sua própria base de dados. Revise os valores antes de salvar.`
          : 'A IA não retornou itens — tente descrever de outra forma.'
      );
    } finally {
      setGerandoIA(false);
    }
  }

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
      const novosItens = (data.itens || []).map((it) => ({ ...it, id: novoId() }));
      setItens((lista) => [...lista, ...novosItens]);
      setAvisoVistoria(
        (data.resumo || `${novosItens.length} item(ns) extraído(s) da vistoria.`) +
          (novosItens.length > 0 ? '\nRevise e preencha MO/MA antes de salvar.' : '')
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
    setSalvando(false);
    const data = await res.json();
    if (!res.ok) {
      setErro(data.error || 'Erro ao salvar orçamento');
      return;
    }
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

      <div className="card p-5 border-l-4 border-l-accent">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="font-semibold text-sm">Criar itens com IA</h3>
          <span className="text-[10px] font-mono border border-linha rounded px-1.5 py-0.5 text-marinho/50">NOVO</span>
        </div>
        <p className="text-xs text-marinho/50 mb-3">
          Descreva o imóvel/serviço e a IA sugere os itens (ambiente, serviço, MO e MA) com base no seu catálogo e nos orçamentos que você já fez para imóveis parecidos.
        </p>
        <textarea
          value={descricaoIA}
          onChange={(e) => setDescricaoIA(e.target.value)}
          rows={3}
          placeholder="Ex: Apartamento padrão, precisa de pintura de 2 quartos e sala, troca de piso do banheiro social e reparo elétrico na cozinha."
          className="w-full border border-linha rounded px-3 py-2 bg-papel mb-3"
        />
        <button
          type="button"
          onClick={handleGerarIA}
          disabled={gerandoIA}
          className="bg-marinho text-white rounded px-4 py-2 text-sm font-semibold disabled:opacity-50"
        >
          {gerandoIA ? 'Gerando…' : 'Gerar itens com IA'}
        </button>
        {avisoIA && <div className="text-xs text-marinho/60 mt-2">{avisoIA}</div>}
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

      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">Itens do orçamento</h3>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {catalogo && catalogo.length > 0 && (
            <>
              <select value={catalogoSelecionado} onChange={(e) => setCatalogoSelecionado(e.target.value)} className="border border-linha rounded px-2 py-1.5 bg-papel text-sm flex-1 min-w-[220px]">
                {catalogo.map((c) => (
                  <option key={c.id} value={c.id}>{c.ambiente} — {c.servico}</option>
                ))}
              </select>
              <button type="button" onClick={adicionarDoCatalogo} className="border border-linha rounded px-3 py-1.5 text-sm">
                Adicionar do catálogo
              </button>
            </>
          )}
          <button type="button" onClick={adicionarItemManual} className="border border-marinho text-marinho rounded px-3 py-1.5 text-sm">
            + Item manual
          </button>
        </div>

        {itens.length === 0 ? (
          <div className="border border-dashed border-linha p-6 text-center text-marinho/40 text-sm">
            Nenhum item ainda. Envie uma vistoria ou adicione manualmente.
          </div>
        ) : (
          <div className="space-y-3">
            {itens.map((it) => (
              <div key={it.id} className="border border-linha rounded p-3 grid sm:grid-cols-12 gap-2 items-start text-sm">
                <input
                  className="sm:col-span-2 border border-linha rounded px-2 py-1 bg-papel"
                  placeholder="Ambiente"
                  value={it.ambiente}
                  onChange={(e) => atualizarItem(it.id, 'ambiente', e.target.value)}
                />
                <input
                  className="sm:col-span-2 border border-linha rounded px-2 py-1 bg-papel"
                  placeholder="Serviço"
                  value={it.servico}
                  onChange={(e) => atualizarItem(it.id, 'servico', e.target.value)}
                />
                <textarea
                  className="sm:col-span-4 border border-linha rounded px-2 py-1 bg-papel"
                  placeholder="Descrição"
                  rows={1}
                  value={it.descricao}
                  onChange={(e) => atualizarItem(it.id, 'descricao', e.target.value)}
                />
                <input
                  type="number" step="0.01"
                  className="sm:col-span-1 border border-linha rounded px-2 py-1 bg-papel"
                  placeholder="MO"
                  value={it.mo}
                  onChange={(e) => atualizarItem(it.id, 'mo', e.target.value)}
                />
                <input
                  type="number" step="0.01"
                  className="sm:col-span-1 border border-linha rounded px-2 py-1 bg-papel"
                  placeholder="MA"
                  value={it.ma}
                  onChange={(e) => atualizarItem(it.id, 'ma', e.target.value)}
                />
                <button type="button" onClick={() => removerItem(it.id)} className="sm:col-span-2 text-erro text-xs text-right">
                  remover
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

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
        {salvando ? 'Salvando…' : tipo === 'manutencao' ? 'Criar solicitação' : 'Criar orçamento'}
      </button>
    </form>
  );
}

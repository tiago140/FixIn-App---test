'use client';

import { useEffect, useState } from 'react';
import { Sparkles, Wand2, Undo2, Plus, Trash2, Loader2, PackagePlus } from 'lucide-react';
import { fmtBRL } from '@/lib/format';
import { categoriaEspecial } from '@/lib/itensEspeciais';
import AlertaItensEspeciais from '@/components/AlertaItensEspeciais';

let seq = 0;
const novoId = () => `novo-ed-${++seq}-${Date.now()}`; // prefixo "novo-": a tela de gestão trata como item a ser criado
const chave = (s) => String(s ?? '').trim().toLowerCase();
const totalItem = (it) => (Number(it.mo) || 0) + (Number(it.ma) || 0);
const semPreco = (it) => totalItem(it) === 0;

const ORIGEM = {
  catalogo: 'Valor do seu catálogo',
  historico: 'Valor de um orçamento seu anterior',
  estimativa: 'Estimativa de mercado feita pela IA',
  editado: 'Item alterado pela IA',
  novo: 'Item criado pela IA',
  ia: 'Item criado pela IA',
};

// Chama uma rota de IA SEM nunca ficar pendurado: sempre devolve { data } ou { erro } e tem limite de tempo.
async function chamarIA(rota, corpo, ms = 58000) {
  const controle = new AbortController();
  const timer = setTimeout(() => controle.abort(), ms);
  try {
    const res = await fetch(rota, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo), signal: controle.signal });
    const txt = await res.text();
    let data = null;
    try { data = JSON.parse(txt); } catch (e) {}
    if (!res.ok) {
      return { erro: data?.error || (res.status === 504 || res.status === 502 ? 'O servidor demorou demais para responder. Tente de novo, com menos itens se puder.' : `Não foi possível concluir (erro ${res.status}).`) };
    }
    if (!data) return { erro: 'Resposta inesperada do servidor. Tente de novo.' };
    return { data };
  } catch (e) {
    return { erro: e?.name === 'AbortError' ? 'A IA demorou demais para responder. Tente de novo (com menos itens, se puder).' : 'Sem conexão com o servidor. Confira a internet e tente de novo.' };
  } finally {
    clearTimeout(timer);
  }
}

const COLUNAS = 'md:grid-cols-[minmax(0,1.3fr)_minmax(0,2.4fr)_8.5rem_8.5rem_7.5rem_2.25rem]';
const campo = 'w-full border border-linha rounded px-2 py-1.5 bg-papel text-sm';

// Itens do orçamento (tabela agrupada por ambiente) + ferramentas de IA logo abaixo, para quem é o dono.
export default function EditorItensOrcamento({ itens, setItens, endereco = '', catalogo = [] }) {
  const [marcas, setMarcas] = useState({});
  const [desfazer, setDesfazer] = useState(null);
  const [ocupado, setOcupado] = useState(null); // 'valores' | 'editar' | 'criar'
  const [segundos, setSegundos] = useState(0);
  const [msg, setMsg] = useState(null);
  const [obs, setObs] = useState('');
  const [soSemPreco, setSoSemPreco] = useState(true);
  const [comando, setComando] = useState('');
  const [descCriar, setDescCriar] = useState('');
  const [catSel, setCatSel] = useState(catalogo?.[0]?.id || '');

  useEffect(() => {
    if (!ocupado) return undefined;
    setSegundos(0);
    const t = setInterval(() => setSegundos((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [ocupado]);

  const nSemPreco = itens.filter(semPreco).length;
  const alvos = soSemPreco ? nSemPreco : itens.length;
  const somaItens = itens.reduce((a, it) => a + totalItem(it), 0);

  // grupos = itens seguidos do mesmo ambiente
  const grupos = [];
  itens.forEach((it) => {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && chave(ultimo.ambiente) === chave(it.ambiente)) {
      ultimo.itens.push(it);
    } else {
      grupos.push({ chave: it.id, ambiente: it.ambiente || '', itens: [it] });
    }
  });

  const atualizar = (id, c, valor) => {
    setItens((l) => l.map((it) => (it.id === id ? { ...it, [c]: valor } : it)));
    if (c === 'mo' || c === 'ma') setMarcas((m) => { if (!m[id]) return m; const { [id]: _tirado, ...resto } = m; return resto; });
  };
  const remover = (id) => setItens((l) => l.filter((it) => it.id !== id));
  const renomearGrupo = (g, nome) => { const ids = new Set(g.itens.map((i) => i.id)); setItens((l) => l.map((it) => (ids.has(it.id) ? { ...it, ambiente: nome } : it))); };
  const adicionarNoGrupo = (g) => {
    const ultimo = g.itens[g.itens.length - 1].id;
    setItens((l) => { const pos = l.findIndex((it) => it.id === ultimo); const c = [...l]; c.splice(pos + 1, 0, { id: novoId(), ambiente: g.ambiente, servico: '', descricao: '', mo: 0, ma: 0 }); return c; });
  };
  const adicionarAmbiente = () => setItens((l) => [...l, { id: novoId(), ambiente: '', servico: '', descricao: '', mo: 0, ma: 0 }]);
  const adicionarDoCatalogo = () => {
    const c = (catalogo || []).find((x) => x.id === catSel);
    if (c) setItens((l) => [...l, { id: novoId(), ambiente: c.ambiente, servico: c.servico, descricao: '', mo: c.mo_padrao, ma: c.ma_padrao }]);
  };

  async function gerarValores() {
    setMsg(null);
    setOcupado('valores');
    const { data, erro } = await chamarIA('/api/orcamentos/valores-ia', {
      itens: itens.map(({ id, ambiente, servico, descricao, mo, ma }) => ({ id, ambiente, servico, descricao, mo, ma })),
      endereco, instrucao: obs, apenas_sem_preco: soSemPreco,
    });
    setOcupado(null);
    if (erro) return setMsg({ tipo: 'erro', texto: erro });
    const valores = data.valores || [];
    if (valores.length === 0) {
      return setMsg({ tipo: 'info', texto: data.aviso || 'A IA não conseguiu estimar valores para estes itens. Acrescente uma observação para ela ou preencha à mão.' });
    }
    const mapa = new Map(valores.map((v) => [String(v.id), v]));
    setDesfazer({ itens, rotulo: 'Gerar valores com IA' });
    setItens((l) => l.map((it) => (mapa.has(String(it.id)) ? { ...it, mo: mapa.get(String(it.id)).mo, ma: mapa.get(String(it.id)).ma } : it)));
    setMarcas((m) => ({ ...m, ...Object.fromEntries(valores.map((v) => [String(v.id), v.origem])) }));
    const o = data.origens || {};
    const faltou = (data.total_alvos || 0) - valores.length;
    setMsg({
      tipo: 'ok',
      texto: `${valores.length} de ${data.total_alvos} item(ns) com valor sugerido (${o.catalogo || 0} do seu catálogo, ${o.historico || 0} de orçamentos seus, ${o.estimativa || 0} estimados pelo mercado).${faltou > 0 ? ` ${faltou} ficaram sem preço: a IA entendeu que não geram custo ou não conseguiu estimar — preencha à mão se precisar.` : ''} Revise antes de salvar.`,
    });
  }

  async function editarComIA() {
    if (!comando.trim()) return setMsg({ tipo: 'erro', texto: 'Escreva o que você quer mudar nos itens.' });
    setMsg(null);
    setOcupado('editar');
    const { data, erro } = await chamarIA('/api/orcamentos/editar-ia', { itens, endereco, instrucao: comando });
    setOcupado(null);
    if (erro) return setMsg({ tipo: 'erro', texto: erro });
    const c = data.contagem || {};
    if (!c.removidos && !c.alterados && !c.adicionados) return setMsg({ tipo: 'info', texto: data.resumo });
    setDesfazer({ itens, rotulo: 'Editar com IA' });
    setItens(data.itens);
    setMarcas((m) => ({ ...m, ...(data.marcados || {}) }));
    setComando('');
    setMsg({ tipo: 'ok', texto: `${data.resumo} (${c.alterados} alterado(s), ${c.adicionados} novo(s), ${c.removidos} removido(s)). Revise antes de salvar.` });
  }

  async function criarComIA() {
    if (!descCriar.trim()) return setMsg({ tipo: 'erro', texto: 'Descreva o imóvel/serviço antes de gerar.' });
    setMsg(null);
    setOcupado('criar');
    const { data, erro } = await chamarIA('/api/orcamentos/gerar-ia', { descricao: descCriar, endereco });
    setOcupado(null);
    if (erro) return setMsg({ tipo: 'erro', texto: erro });
    const novos = (data.itens || []).map((it) => ({ ...it, id: novoId() }));
    if (novos.length === 0) return setMsg({ tipo: 'info', texto: 'A IA não retornou itens. Tente descrever de outra forma.' });
    setDesfazer({ itens, rotulo: 'Criar itens com IA' });
    setItens((l) => [...l, ...novos]);
    setMarcas((m) => ({ ...m, ...Object.fromEntries(novos.map((n) => [n.id, 'ia'])) }));
    setDescCriar('');
    setMsg({ tipo: 'ok', texto: `${novos.length} item(ns) criado(s) pela IA com base na sua base de dados. Revise os valores antes de salvar.` });
  }

  function desfazerUltima() {
    if (!desfazer) return;
    setItens(desfazer.itens);
    setMarcas({});
    setDesfazer(null);
    setMsg({ tipo: 'info', texto: 'Desfeito: os itens voltaram como estavam antes.' });
  }

  const corMsg = { ok: 'bg-sucesso/10 border-sucesso text-sucesso', erro: 'bg-erro/10 border-erro text-erro', info: 'bg-info/10 border-info text-info' };
  const rodando = (qual, texto) => (ocupado === qual ? <><Loader2 size={16} className="animate-spin" /> Gerando… {segundos}s</> : texto);

  return (
    <div className="space-y-6">
      <AlertaItensEspeciais itens={itens} />
      <div className="card p-0 overflow-hidden">
        <div className="px-5 pt-5 pb-3 flex items-center gap-3 flex-wrap">
          <h3 className="font-slab text-xl font-bold text-marinho">Itens do orçamento</h3>
          <span className="text-xs font-semibold rounded-full px-2.5 py-0.5 bg-marinho/10 text-marinho">{itens.length} {itens.length === 1 ? 'item' : 'itens'}</span>
          {itens.length > 0 && (nSemPreco > 0
            ? <span className="text-xs font-bold rounded-full px-2.5 py-0.5 bg-alerta/20 text-alerta">{nSemPreco} sem preço</span>
            : <span className="text-xs font-bold rounded-full px-2.5 py-0.5 bg-sucesso/15 text-sucesso">todos com preço</span>)}
          <div className="ml-auto flex gap-2 flex-wrap items-center">
            {catalogo && catalogo.length > 0 && (
              <>
                <select value={catSel} onChange={(e) => setCatSel(e.target.value)} aria-label="Item do catálogo" className="border border-linha rounded px-2 py-1.5 bg-papel text-sm max-w-[220px]">
                  {catalogo.map((c) => <option key={c.id} value={c.id}>{c.ambiente} — {c.servico}</option>)}
                </select>
                <button type="button" onClick={adicionarDoCatalogo} className="inline-flex items-center gap-1.5 border border-linha bg-white rounded-lg px-3 py-1.5 text-sm font-semibold hover:bg-papel"><PackagePlus size={15} /> Do catálogo</button>
              </>
            )}
            <button type="button" onClick={adicionarAmbiente} className="inline-flex items-center gap-1.5 border border-marinho text-marinho bg-white rounded-lg px-3 py-1.5 text-sm font-semibold hover:bg-papel"><Plus size={15} /> Novo ambiente / item</button>
          </div>
        </div>

        {itens.length === 0 ? (
          <div className="mx-5 mb-5 border-2 border-dashed border-linha rounded-lg p-8 text-center text-marinho/50 text-sm">
            Nenhum item ainda. Envie uma vistoria, peça para a IA criar logo abaixo ou adicione um item manualmente.
          </div>
        ) : (
          <>
            <div className={`hidden md:grid ${COLUNAS} gap-2 px-5 py-2 bg-marinho text-white text-[11px] font-semibold uppercase tracking-wide`}>
              <span>Serviço</span><span>Descrição</span><span className="text-right">Mão de obra (R$)</span><span className="text-right">Material (R$)</span><span className="text-right">Total (R$)</span><span />
            </div>
            {grupos.map((g) => {
              const subtotal = g.itens.reduce((a, it) => a + totalItem(it), 0);
              return (
                <div key={g.chave} className="border-t border-linha">
                  <div className="flex items-center gap-3 flex-wrap px-5 py-2 bg-papel">
                    <input
                      value={g.ambiente}
                      onChange={(e) => renomearGrupo(g, e.target.value)}
                      placeholder="Nome do ambiente (ex.: Cozinha)"
                      aria-label="Nome do ambiente"
                      className="font-semibold text-marinho bg-transparent border-b border-dashed border-marinho/30 focus:border-marinho outline-none px-1 py-0.5 min-w-[200px]"
                    />
                    <span className="text-xs text-marinho/50">{g.itens.length} {g.itens.length === 1 ? 'item' : 'itens'} · subtotal <b className="font-mono text-marinho/70">{fmtBRL(subtotal)}</b></span>
                    <button type="button" onClick={() => adicionarNoGrupo(g)} className="ml-auto text-xs font-semibold text-marinho/70 hover:text-marinho inline-flex items-center gap-1"><Plus size={13} /> item neste ambiente</button>
                  </div>
                  {g.itens.map((it) => {
                    const origem = marcas[it.id];
                    const sem = semPreco(it);
                    const especial = categoriaEspecial(it);
                    return (
                      <div key={it.id} data-item={it.id} className={`grid grid-cols-2 ${COLUNAS} gap-2 px-5 py-3 border-t border-linha/70 items-start border-l-4 ${sem || especial ? 'border-l-alerta bg-alerta/5' : 'border-l-transparent'}`}>
                        <div className="col-span-2 md:col-span-1">
                          <label className="md:hidden block text-[11px] text-marinho/50 mb-0.5">Serviço</label>
                          <input aria-label="Serviço" className={campo} value={it.servico} onChange={(e) => atualizar(it.id, 'servico', e.target.value)} placeholder="Serviço" />
                          {(sem || origem || especial) && (
                            <div className="mt-1 flex gap-1.5 flex-wrap">
                              {especial && <span title="Item que pede atenção ao orçar" className="text-[10px] font-bold uppercase rounded px-1.5 py-0.5 bg-alerta text-white">⚠ {especial.rotulo}</span>}
                              {sem && <span className="text-[10px] font-bold uppercase text-alerta">sem preço</span>}
                              {origem && <span title={ORIGEM[origem]} className="text-[10px] font-bold rounded px-1.5 py-0.5 bg-marinho text-white">IA · {origem === 'catalogo' ? 'catálogo' : origem === 'historico' ? 'seu histórico' : origem === 'estimativa' ? 'estimativa' : origem === 'editado' ? 'alterado' : 'novo'}</span>}
                            </div>
                          )}
                        </div>
                        <div className="col-span-2 md:col-span-1">
                          <label className="md:hidden block text-[11px] text-marinho/50 mb-0.5">Descrição</label>
                          <textarea aria-label="Descrição" className={`${campo} resize-y`} rows={2} value={it.descricao || ''} onChange={(e) => atualizar(it.id, 'descricao', e.target.value)} placeholder="Descrição" />
                        </div>
                        <div>
                          <label className="md:hidden block text-[11px] text-marinho/50 mb-0.5">Mão de obra (R$)</label>
                          <input aria-label="Mão de obra" type="number" step="0.01" min="0" inputMode="decimal" className={`${campo} text-right font-mono`} value={it.mo} onChange={(e) => atualizar(it.id, 'mo', e.target.value)} />
                        </div>
                        <div>
                          <label className="md:hidden block text-[11px] text-marinho/50 mb-0.5">Material (R$)</label>
                          <input aria-label="Material" type="number" step="0.01" min="0" inputMode="decimal" className={`${campo} text-right font-mono`} value={it.ma} onChange={(e) => atualizar(it.id, 'ma', e.target.value)} />
                        </div>
                        <div className="text-right md:pt-1.5">
                          <label className="md:hidden block text-[11px] text-marinho/50 mb-0.5">Total (R$)</label>
                          <span data-total className="font-mono font-semibold text-marinho">{fmtBRL(totalItem(it))}</span>
                        </div>
                        <div className="text-right md:pt-1">
                          <button type="button" onClick={() => remover(it.id)} aria-label="Remover item" title="Remover item" className="text-erro hover:bg-erro/10 rounded p-1.5"><Trash2 size={16} /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
            <div className="flex justify-between items-center px-5 py-3 border-t-2 border-marinho/20 bg-papel text-sm">
              <span className="text-marinho/60">Soma dos itens (custo base)</span>
              <span className="font-mono font-bold text-marinho text-base" data-soma>{fmtBRL(somaItens)}</span>
            </div>
          </>
        )}
      </div>

      <div id="ferramentas-ia" className="card p-5 border-l-4 border-l-marinho scroll-mt-20">
        <h3 className="font-slab text-xl font-bold text-marinho flex items-center gap-2"><Sparkles size={20} /> Ferramentas de IA</h3>
        <p className="text-sm text-marinho/60 mt-1">
          Usam o seu catálogo e os orçamentos que você já fez. O que a IA mexer aparece marcado com <b>IA</b> e só vale depois que você salvar. Dá para desfazer.
        </p>

        {msg && (
          <div role="status" className={`mt-4 text-sm border rounded-lg px-4 py-3 flex items-start gap-3 ${corMsg[msg.tipo]}`}>
            <span className="flex-1">{msg.texto}</span>
            {desfazer && msg.tipo === 'ok' && (
              <button type="button" onClick={desfazerUltima} className="inline-flex items-center gap-1.5 font-semibold underline whitespace-nowrap"><Undo2 size={15} /> Desfazer</button>
            )}
          </div>
        )}

        <div className="mt-4 rounded-lg border border-marinho/30 bg-marinho/5 p-4">
          <h4 className="font-semibold text-marinho">1. Gerar valores com IA</h4>
          <p className="text-sm text-marinho/60 mt-0.5 mb-3">A IA lê cada item acima e preenche mão de obra e material com valores de mercado, reaproveitando os preços que você já usa.</p>
          <textarea
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            rows={2}
            aria-label="Observações para a IA"
            placeholder="Observações para a IA (opcional). Ex.: imóvel de padrão médio; use preço de mercado de Sorocaba."
            className="w-full border border-linha rounded px-3 py-2 bg-white text-sm mb-3"
          />
          <div className="flex items-center gap-4 flex-wrap">
            <button
              type="button"
              onClick={gerarValores}
              disabled={!!ocupado || alvos === 0}
              className="inline-flex items-center gap-2 bg-marinho text-white rounded-lg px-5 py-2.5 text-sm font-bold shadow disabled:opacity-50"
            >
              {rodando('valores', <><Sparkles size={16} /> Gerar valores com IA {alvos > 0 ? `(${alvos} ${alvos === 1 ? 'item' : 'itens'})` : ''}</>)}
            </button>
            <label className="inline-flex items-center gap-2 text-sm text-marinho/70">
              <input type="checkbox" checked={soSemPreco} onChange={(e) => setSoSemPreco(e.target.checked)} />
              Preencher só os itens sem preço
            </label>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-4 mt-4">
          <div className="rounded-lg border border-linha p-4">
            <h4 className="font-semibold text-marinho flex items-center gap-2"><Wand2 size={16} /> 2. Editar com IA</h4>
            <p className="text-sm text-marinho/60 mt-0.5 mb-3">Escreva o que mudar e a IA ajusta a lista. Ex.: “tire os itens da fachada” ou “troque o piso do banheiro por porcelanato”.</p>
            <textarea value={comando} onChange={(e) => setComando(e.target.value)} rows={2} aria-label="O que mudar nos itens" placeholder="O que você quer mudar nos itens?" className="w-full border border-linha rounded px-3 py-2 bg-papel text-sm mb-3" />
            <button type="button" onClick={editarComIA} disabled={!!ocupado || itens.length === 0} className="inline-flex items-center gap-2 bg-white border border-marinho text-marinho rounded-lg px-4 py-2 text-sm font-bold hover:bg-papel disabled:opacity-50">
              {rodando('editar', <><Wand2 size={16} /> Aplicar edição</>)}
            </button>
          </div>
          <div className="rounded-lg border border-linha p-4">
            <h4 className="font-semibold text-marinho flex items-center gap-2"><Plus size={16} /> 3. Criar itens com IA</h4>
            <p className="text-sm text-marinho/60 mt-0.5 mb-3">Descreva o imóvel ou o serviço e a IA acrescenta os itens (com valores) à lista.</p>
            <textarea value={descCriar} onChange={(e) => setDescCriar(e.target.value)} rows={2} aria-label="Descrição para criar itens" placeholder="Ex.: pintura de 2 quartos e sala, troca de piso do banheiro e reparo elétrico na cozinha." className="w-full border border-linha rounded px-3 py-2 bg-papel text-sm mb-3" />
            <button type="button" onClick={criarComIA} disabled={!!ocupado} className="inline-flex items-center gap-2 bg-white border border-marinho text-marinho rounded-lg px-4 py-2 text-sm font-bold hover:bg-papel disabled:opacity-50">
              {rodando('criar', <><Plus size={16} /> Criar itens</>)}
            </button>
          </div>
        </div>
        <p className="text-xs text-marinho/50 mt-4">Quer digitar os preços você mesmo? É só preencher “Mão de obra” e “Material” de cada item acima: o total e a soma se atualizam na hora.</p>
      </div>
    </div>
  );
}

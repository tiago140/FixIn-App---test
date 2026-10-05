import { Hourglass, PencilRuler, CheckCircle2, XCircle, AlertTriangle, Clock } from 'lucide-react';
import AlvoRolagem from '@/components/AlvoRolagem';
import { fmtBRL } from '@/lib/format';
import { SITUACOES, FAIXAS_ESPERA, resumoPorSituacao, visaoDoTodo } from '@/lib/painel';

const TONS_ESPERA = ['#3B6B8C', '#B8862E', '#D9822B', '#C0392B'];
const pct = (parte, todo) => (todo > 0 ? Math.round((parte / todo) * 100) : 0);

// "O todo": quantos orçamentos E quanto dinheiro em cada situação — o que está esperando resposta, o que ainda vai ser orçado,
// o que foi fechado e o que foi recusado. Cada linha clica e leva à lista abaixo, destacando os orçamentos que entram na conta.
// veValores = false (operacional da imobiliária): só quantidades, nenhum R$.
export default function FunilOrcamentos({ orcamentos, papel = 'master', veValores = true, agora = new Date() }) {
  const lista = orcamentos || [];
  if (lista.length === 0) return null;
  const v = visaoDoTodo(lista, agora);
  const linhas = resumoPorSituacao(lista);
  const master = papel === 'master';
  const totalValor = v.total.valor;
  const maiorQtd = Math.max(1, ...linhas.map((l) => l.qtd));
  const maiorValor = Math.max(1, ...linhas.map((l) => l.valor));

  const titulo = master ? 'O todo: onde está o dinheiro' : veValores ? 'Seus orçamentos: situação e valores' : 'Seus orçamentos por situação';

  const rotulosCartao = master
    ? { espera: 'Esperando resposta da imobiliária', orcar: 'A orçar (FixIn)', fechado: 'Fechado (aprovado)', recusado: 'Recusado (perdido)' }
    : { espera: 'Esperando a sua resposta', orcar: 'A FixIn está orçando', fechado: 'Aprovado', recusado: 'Recusado' };

  const segmentos = [
    { chave: 'espera', rotulo: rotulosCartao.espera, cor: '#3B6B8C', valor: v.aguardando.valor },
    { chave: 'orcar', rotulo: rotulosCartao.orcar, cor: '#B8862E', valor: v.aOrcar.valor },
    { chave: 'fechado', rotulo: rotulosCartao.fechado, cor: '#3F7A5E', valor: v.aprovados.valor },
    { chave: 'recusado', rotulo: rotulosCartao.recusado, cor: '#A63A2D', valor: v.recusados.valor },
  ];

  return (
    <section className="mb-6" aria-label={titulo} data-funil>
      <div className="flex items-baseline justify-between gap-3 flex-wrap mb-3">
        <h2 className="font-slab text-xl font-bold text-marinho">{titulo}</h2>
        <span className="text-sm text-marinho/60">
          {v.total.qtd} orçamento(s){veValores ? <> · valor total <b className="text-marinho">{fmtBRL(totalValor)}</b></> : null}
        </span>
      </div>

      {veValores && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
            <Cartao alvo="st-enviado" n={v.aguardando.qtd} cor="#3B6B8C" icone={Hourglass} titulo={rotulosCartao.espera} valor={fmtBRL(v.aguardando.valor)} destaque
              linhas={[`${v.aguardando.qtd} orçamento(s)`, v.aguardando.maisAntigoDias >= 8 ? `⚠ o mais antigo espera há ${v.aguardando.maisAntigoDias} dias` : null]} />
            <Cartao alvo="aorcar" n={v.aOrcar.qtd} cor="#B8862E" icone={PencilRuler} titulo={rotulosCartao.orcar} valor={fmtBRL(v.aOrcar.valor)}
              linhas={[`${v.aOrcar.qtd} orçamento(s)`, v.aOrcar.semPreco > 0 ? `${v.aOrcar.semPreco} ainda sem preço` : null]} />
            <Cartao alvo="aprovado" n={v.aprovados.qtd} cor="#3F7A5E" icone={CheckCircle2} titulo={rotulosCartao.fechado} valor={fmtBRL(v.aprovados.valor)}
              linhas={[`${v.aprovados.qtd} orçamento(s)`, `Recebido ${fmtBRL(v.aprovados.recebido)} · A receber ${fmtBRL(v.aprovados.aReceber)}`]} />
            <Cartao alvo="st-rejeitado" n={v.recusados.qtd} cor="#A63A2D" icone={XCircle} titulo={rotulosCartao.recusado} valor={fmtBRL(v.recusados.valor)}
              linhas={[`${v.recusados.qtd} orçamento(s)`, v.taxaAprovacao !== null ? `Taxa de aprovação ${v.taxaAprovacao}% (${v.aprovados.qtd} de ${v.decididos} decididos)` : null]} />
          </div>

          {totalValor > 0 && (
            <div className="bg-white border border-linha rounded-lg p-4 mb-4">
              <div className="text-xs font-semibold text-marinho/60 uppercase tracking-wide mb-2">Como o valor total está dividido</div>
              <div className="flex h-5 rounded overflow-hidden bg-papel" role="img" aria-label="Divisão do valor total por situação">
                {segmentos.filter((s) => s.valor > 0).map((s) => (
                  <div key={s.chave} data-segmento={s.chave} title={`${s.rotulo}: ${fmtBRL(s.valor)} (${pct(s.valor, totalValor)}%)`} style={{ width: `${(s.valor / totalValor) * 100}%`, background: s.cor, minWidth: 3 }} />
                ))}
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2 text-xs text-marinho/70">
                {segmentos.map((s) => (
                  <span key={s.chave} className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ background: s.cor }} />
                    {s.rotulo}: <b className="text-marinho">{fmtBRL(s.valor)}</b> ({pct(s.valor, totalValor)}%)
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <div className="bg-white border border-linha rounded-lg overflow-hidden mb-4">
        <div className={`hidden md:grid ${veValores ? 'grid-cols-[minmax(0,2.2fr)_5rem_9rem_minmax(0,2fr)]' : 'grid-cols-[minmax(0,2.2fr)_5rem_minmax(0,2fr)]'} gap-3 px-4 py-2 bg-marinho text-white text-[11px] font-semibold uppercase tracking-wide`}>
          <span>Situação</span><span className="text-right">Qtd</span>{veValores && <span className="text-right">Valor (R$)</span>}<span>{veValores ? 'Parte do valor total' : 'Parte do total'}</span>
        </div>
        {linhas.map((l) => {
          const s = SITUACOES.find((x) => x.chave === l.chave);
          const parte = veValores ? pct(l.valor, totalValor) : pct(l.qtd, v.total.qtd);
          const largura = veValores ? (l.valor / maiorValor) * 100 : (l.qtd / maiorQtd) * 100;
          const linha = (
            <div data-situacao={l.chave} className={`grid ${veValores ? 'md:grid-cols-[minmax(0,2.2fr)_5rem_9rem_minmax(0,2fr)]' : 'md:grid-cols-[minmax(0,2.2fr)_5rem_minmax(0,2fr)]'} grid-cols-[1fr_auto] gap-x-3 gap-y-1 px-4 py-2.5 border-t border-linha items-center ${l.qtd === 0 ? 'opacity-50' : 'hover:bg-papel'}`}>
              <span className="flex items-center gap-2 text-sm font-semibold text-marinho"><span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: s.cor }} />{s.rotulo[master ? 'master' : 'imobiliaria']}</span>
              <span className="text-right font-mono font-bold text-marinho">{l.qtd}</span>
              {veValores && <span className="text-right font-mono text-sm text-marinho col-span-2 md:col-span-1">{fmtBRL(l.valor)}{l.semPreco > 0 && l.qtd > 0 ? <>{' '}<span className="text-[11px] text-alerta">({l.semPreco} sem preço)</span></> : null}</span>}
              <span className="flex items-center gap-2 col-span-2 md:col-span-1">
                <span className="flex-1 h-2 rounded bg-papel overflow-hidden"><span className="block h-full rounded" style={{ width: `${Math.max(largura, l.qtd > 0 ? 2 : 0)}%`, background: s.cor }} /></span>
                <span className="text-xs text-marinho/60 w-9 text-right">{parte}%</span>
              </span>
            </div>
          );
          return (
            <AlvoRolagem key={l.chave} alvo={`st-${l.chave}`} n={l.qtd} dica={false} rotulo={`Ver ${l.qtd} orçamento(s): ${s.rotulo[master ? 'master' : 'imobiliaria']}`} className="rounded-none block">{linha}</AlvoRolagem>
          );
        })}
        {v.atraso.qtd > 0 && (
          <AlvoRolagem alvo="atraso" n={v.atraso.qtd} dica={false} rotulo={`Ver ${v.atraso.qtd} orçamento(s) com pagamento em atraso`} className="rounded-none block">
            <div data-situacao="atraso" className="flex items-center justify-between gap-3 px-4 py-2.5 border-t-2 border-erro/30 bg-erro/5 text-sm hover:bg-erro/10">
              <span className="flex items-center gap-2 font-semibold text-marinho"><AlertTriangle size={15} className="text-erro" /> Pagamento em atraso <span className="font-normal text-marinho/60">(já contados nos aprovados acima)</span></span>
              <span className="font-mono"><b>{v.atraso.qtd}</b>{veValores ? <> · falta receber <b>{fmtBRL(v.atraso.valor)}</b></> : null}</span>
            </div>
          </AlvoRolagem>
        )}
      </div>

      {v.aguardando.qtd > 0 && (
        <div className="bg-white border border-linha rounded-lg p-4" data-espera>
          <div className="flex items-center gap-2 text-sm font-semibold text-marinho mb-0.5"><Clock size={16} /> {master ? 'Parados esperando resposta da imobiliária' : 'Esperando a sua resposta'}: há quanto tempo?</div>
          <div className="text-xs text-marinho/50 mb-3">Contado desde a última atualização de cada orçamento. Quanto mais antigo, mais vale cobrar uma resposta.</div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {v.espera.map((f, i) => (
              <AlvoRolagem key={f.chave} alvo={`espera-${f.chave}`} n={f.qtd} dica={false} rotulo={`Ver ${f.qtd} orçamento(s) parados ${f.rotulo}`} className="block h-full">
                <div data-faixa={f.chave} className={`rounded-lg border p-3 h-full ${f.qtd === 0 ? 'opacity-50 border-linha' : 'border-linha'}`} style={{ borderTop: `4px solid ${TONS_ESPERA[i]}` }}>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-marinho/60">{f.rotulo}</div>
                  <div className="font-slab text-2xl font-bold text-marinho">{f.qtd}</div>
                  {veValores && <div className="text-xs font-mono text-marinho/70">{fmtBRL(f.valor)}</div>}
                </div>
              </AlvoRolagem>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function Cartao({ alvo, n, cor, icone: Icone, titulo, valor, linhas = [], destaque = false }) {
  const corpo = (
    <div className={`bg-white border border-linha rounded-lg p-4 h-full shadow-sm ${destaque ? 'ring-1 ring-marinho/15' : ''}`} style={{ borderLeft: `4px solid ${cor}` }}>
      <div className="flex items-center gap-2 text-[11px] font-bold text-marinho/60 uppercase tracking-wide"><Icone size={15} style={{ color: cor }} /> {titulo}</div>
      <div className="font-slab text-[28px] leading-tight font-bold text-marinho mt-1">{valor}</div>
      {linhas.filter(Boolean).map((l, i) => <div key={i} className="text-xs text-marinho/60 mt-0.5">{l}</div>)}
    </div>
  );
  return <AlvoRolagem alvo={alvo} n={n} dica={false} rotulo={`Ver na lista abaixo: ${titulo}`} className="block h-full">{corpo}</AlvoRolagem>;
}

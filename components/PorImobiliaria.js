import Link from 'next/link';
import { fmtBRL } from '@/lib/format';
import { visaoDoTodo } from '@/lib/painel';

// Quando o painel mostra TODAS as imobiliárias: uma linha por imobiliária, com quantidade e valor em cada situação.
// Ordenada por quanto dinheiro está esperando resposta. Clicar na linha aplica o filtro daquela imobiliária.
export default function PorImobiliaria({ orcamentos, agora = new Date() }) {
  const grupos = new Map();
  (orcamentos || []).forEach((o) => {
    if (!o.cliente_id) return;
    if (!grupos.has(o.cliente_id)) grupos.set(o.cliente_id, { id: o.cliente_id, nome: o.clientes?.nome_empresa || '—', itens: [] });
    grupos.get(o.cliente_id).itens.push(o);
  });
  const linhas = [...grupos.values()].map((g) => ({ ...g, v: visaoDoTodo(g.itens, agora) })).sort((a, b) => b.v.aguardando.valor - a.v.aguardando.valor || b.v.total.qtd - a.v.total.qtd);
  if (linhas.length < 2) return null;

  const cab = 'grid-cols-[minmax(0,2.2fr)_4rem_minmax(0,1.6fr)_minmax(0,1.2fr)_minmax(0,1.2fr)_minmax(0,1.2fr)]';
  return (
    <section className="mb-6" data-por-imobiliaria aria-label="Por imobiliária">
      <h2 className="font-slab text-xl font-bold text-marinho mb-3">Por imobiliária <span className="text-sm font-normal text-marinho/50">(clique para filtrar)</span></h2>
      <div className="bg-white border border-linha rounded-lg overflow-x-auto">
        <div className="min-w-[44rem]">
          <div className={`grid ${cab} gap-3 px-4 py-2 bg-marinho text-white text-[11px] font-semibold uppercase tracking-wide`}>
            <span>Imobiliária</span><span className="text-right">Qtd</span><span className="text-right">Esperando resposta</span><span className="text-right">A orçar</span><span className="text-right">Fechado</span><span className="text-right">Recusado</span>
          </div>
          {linhas.map((l) => (
            <Link key={l.id} href={`?cliente=${l.id}`} data-imobiliaria={l.id} className={`grid ${cab} gap-3 px-4 py-2.5 border-t border-linha items-center hover:bg-papel text-sm`}>
              <span className="font-semibold text-marinho truncate">{l.nome}</span>
              <span className="text-right font-mono font-bold text-marinho">{l.v.total.qtd}</span>
              <span className="text-right font-mono text-marinho"><b>{l.v.aguardando.qtd}</b> · {fmtBRL(l.v.aguardando.valor)}{l.v.aguardando.maisAntigoDias >= 8 ? <span className="block text-[11px] text-alerta">mais antigo: {l.v.aguardando.maisAntigoDias} dias</span> : null}</span>
              <span className="text-right font-mono text-marinho"><b>{l.v.aOrcar.qtd}</b>{l.v.aOrcar.valor > 0 ? <> · {fmtBRL(l.v.aOrcar.valor)}</> : null}</span>
              <span className="text-right font-mono text-sucesso"><b>{l.v.aprovados.qtd}</b> · {fmtBRL(l.v.aprovados.valor)}</span>
              <span className="text-right font-mono text-erro"><b>{l.v.recusados.qtd}</b> · {fmtBRL(l.v.recusados.valor)}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

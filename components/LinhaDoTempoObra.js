import { Camera, FileText, Flag } from 'lucide-react';
import { ETAPA_LABEL, ETAPA_COR } from '@/lib/etapasAcomp';

const dh = (d) => new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
const dia = (d) => new Date(d).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', timeZone: 'America/Sao_Paulo' });
const diaChave = (d) => new Date(d).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });

// Linha do tempo da obra (servidor): agrupa por dia; fotos em grade. fotoBase = prefixo da rota de foto (sem a referência).
// acoes: componente opcional (cliente) que recebe o item e desenha botões de apagar/ocultar (só equipe).
export default function LinhaDoTempoObra({ itens, fotoBase, Acoes = null, equipe = false }) {
  if (!itens?.length) return <p className="text-sm text-marinho/50">Ainda não há registros.</p>;
  const dias = [];
  for (const i of itens) {
    const k = diaChave(i.quando);
    let g = dias.find((x) => x.k === k);
    if (!g) { g = { k, ref: i.quando, itens: [] }; dias.push(g); }
    g.itens.push(i);
  }
  return (
    <div className="space-y-6">
      {dias.map((g) => {
        const fotos = g.itens.filter((i) => i.tipo === 'foto');
        const outros = g.itens.filter((i) => i.tipo !== 'foto');
        return (
          <section key={g.k}>
            <h3 className="text-sm font-semibold text-marinho/70 first-letter:uppercase mb-2">{dia(g.ref)}</h3>
            <ul className="space-y-2">
              {outros.map((i) => (
                <li key={i.ref} className="card rounded-xl p-3 flex gap-3 items-start">
                  <span className={`mt-0.5 shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${i.tipo === 'etapa' ? 'bg-marinho text-white' : 'bg-papel text-marinho/70 border border-linha'}`}>
                    {i.tipo === 'etapa' ? <Flag size={14} /> : <FileText size={14} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    {i.tipo === 'etapa' && (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-xs font-semibold rounded-full px-2.5 py-0.5 ${ETAPA_COR[i.etapa] || 'bg-papel'}`}>{ETAPA_LABEL[i.etapa] || i.etapa}</span>
                        {i.percentual != null && <span className="text-xs text-marinho/60">{i.percentual}% concluído</span>}
                      </div>
                    )}
                    {i.texto && <p className="text-sm mt-1 whitespace-pre-wrap">{i.texto}</p>}
                    <p className="text-xs text-marinho/45 mt-1">{dh(i.quando)} · {i.autor}{equipe && i.tipo === 'nota' && !i.publico ? ' · interna (locador não vê)' : ''}</p>
                  </div>
                  {Acoes && i.origem === 'evento' && i.tipo !== 'etapa' && <Acoes item={i} />}
                </li>
              ))}
            </ul>
            {fotos.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                {fotos.map((f) => (
                  <figure key={f.ref} className="relative">
                    <a href={`${fotoBase}/${f.ref}`} target="_blank" rel="noreferrer" className="block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`${fotoBase}/${f.ref}`} alt={f.legenda || 'Foto da obra'} loading="lazy" className="w-full aspect-square object-cover rounded-lg border border-linha" />
                    </a>
                    <figcaption className="text-xs text-marinho/60 mt-1 flex items-start gap-1"><Camera size={11} className="mt-0.5 shrink-0" /><span>{f.legenda || 'Foto'}{equipe && f.origem !== 'os' && f.publico === false ? ' · oculta' : ''} <span className="text-marinho/35">· {f.autor}</span></span></figcaption>
                    {Acoes && f.origem === 'evento' && <div className="mt-1"><Acoes item={f} /></div>}
                  </figure>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

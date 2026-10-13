import { PASSOS_OS, posicaoOS, proximoPassoOS, situacaoPrazo } from '@/lib/etapasObra';

const COR = { erro: 'bg-erro/10 text-erro', alerta: 'bg-alerta/15 text-alerta', marinho: 'bg-marinho/10 text-marinho' };

// Barra de passos no topo da ordem: onde ele está e qual é a próxima ação.
export default function PassosOS({ status, prazo }) {
  const pos = posicaoOS(status);
  const pz = situacaoPrazo(prazo, status);
  if (pos === null) return null;
  return (
    <div className="card p-4 rounded-xl space-y-3">
      <ol className="flex items-center">
        {PASSOS_OS.map((n, i) => {
          const feito = i < pos; const atual = i === pos;
          return (
            <li key={n} className="flex-1 flex flex-col items-center relative min-w-0">
              {i > 0 && <span className={`absolute top-3 right-1/2 w-full h-0.5 ${i <= pos ? 'bg-sucesso' : 'bg-linha'}`} />}
              <span className={`relative z-10 w-6 h-6 rounded-full border-2 text-[11px] font-bold flex items-center justify-center ${feito ? 'bg-sucesso border-sucesso text-white' : atual ? 'bg-marinho border-marinho text-white' : 'bg-white border-linha text-marinho/40'}`}>{feito ? '✓' : i + 1}</span>
              <span className={`mt-1 text-[10px] sm:text-xs text-center ${atual ? 'font-bold' : feito ? 'text-marinho/70' : 'text-marinho/40'}`}>{n}</span>
            </li>
          );
        })}
      </ol>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span><b>Agora:</b> {proximoPassoOS(status)}</span>
        {pz && <span className={`text-xs font-semibold rounded-full px-2.5 py-1 ${COR[pz.cor]}`}>{pz.texto}</span>}
      </div>
    </div>
  );
}

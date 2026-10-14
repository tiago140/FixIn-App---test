'use client';

import { Children, useState } from 'react';

// Mostra as primeiras linhas e guarda as outras escondidas (já na página). Clicar num indicador do painel
// ("30 aguardando") abre as escondidas e destaca TODAS: por isso o contêiner [data-extra] e o botão [data-mostrar-todos].
export default function ListaOrcamentos({ children, limite = 5 }) {
  const itens = Children.toArray(children);
  const [aberto, setAberto] = useState(false);
  const resto = itens.length - limite;
  return (
    <>
      <div className="space-y-2">{itens.slice(0, limite)}</div>
      {resto > 0 && <div data-extra className={`mt-2 space-y-2 ${aberto ? '' : 'hidden'}`}>{itens.slice(limite)}</div>}
      {resto > 0 && (
        <div className="mt-2">
          <button type="button" data-mostrar-todos aria-expanded={aberto} onClick={() => setAberto((a) => !a)}
            className="text-xs font-semibold text-marinho/60 hover:text-marinho">
            {aberto ? 'Mostrar menos' : `Mostrar os outros ${resto}`}
          </button>
        </div>
      )}
    </>
  );
}

'use client';

import { Children, useState } from 'react';

// Mostra os primeiros cartões e guarda os outros escondidos (já na página). Clicar em um indicador do painel
// ("30 aguardando") abre os escondidos e destaca TODOS, não só os 6 primeiros.
export default function GradeOrcamentos({ children, limite = 6 }) {
  const itens = Children.toArray(children);
  const [aberto, setAberto] = useState(false);
  const grade = 'grid sm:grid-cols-2 xl:grid-cols-3 gap-4';
  const resto = itens.length - limite;
  return (
    <>
      <div className={grade}>{itens.slice(0, limite)}</div>
      {resto > 0 && <div data-extra className={`${grade} mt-4 ${aberto ? '' : 'hidden'}`}>{itens.slice(limite)}</div>}
      {resto > 0 && (
        <div className="mt-3 text-center">
          <button type="button" data-mostrar-todos aria-expanded={aberto} onClick={() => setAberto((a) => !a)} className="text-sm font-semibold text-marinho/70 hover:text-marinho border border-linha bg-white rounded-lg px-4 py-1.5 hover:bg-papel">
            {aberto ? 'Mostrar menos' : `Mostrar os outros ${resto} aqui`}
          </button>
        </div>
      )}
    </>
  );
}

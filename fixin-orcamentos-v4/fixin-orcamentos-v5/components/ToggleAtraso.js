'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function ToggleAtraso({ orcamentoId, atrasado }) {
  const router = useRouter();
  const [carregando, setCarregando] = useState(false);

  async function alternar() {
    setCarregando(true);
    await fetch(`/api/orcamentos/${orcamentoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ atrasado: !atrasado }),
    });
    setCarregando(false);
    router.refresh();
  }

  return (
    <button
      disabled={carregando}
      onClick={alternar}
      className={`text-xs px-3 py-1.5 rounded border ${atrasado ? 'bg-erro text-white border-erro' : 'border-erro text-erro'}`}
    >
      {atrasado ? 'Em atraso' : 'Marcar atraso'}
    </button>
  );
}

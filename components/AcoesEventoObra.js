'use client';

import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Trash2 } from 'lucide-react';

// Botões da equipe sobre um lançamento: ocultar/mostrar para o locador e apagar.
export default function AcoesEventoObra({ item, acompId }) {
  const router = useRouter();
  async function alternar() {
    await fetch(`/api/acompanhamento/${acompId}/eventos/${item.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ publico: !item.publico }) });
    router.refresh();
  }
  async function apagar() {
    if (!window.confirm(item.tipo === 'foto' ? 'Apagar esta foto?' : 'Apagar esta anotação?')) return;
    await fetch(`/api/acompanhamento/${acompId}/eventos/${item.id}`, { method: 'DELETE' });
    router.refresh();
  }
  return (
    <span className="inline-flex gap-2 text-marinho/50">
      <button type="button" onClick={alternar} title={item.publico ? 'Ocultar do locador' : 'Mostrar ao locador'} className="hover:text-marinho">{item.publico ? <Eye size={15} /> : <EyeOff size={15} />}</button>
      <button type="button" onClick={apagar} title="Apagar" className="hover:text-erro"><Trash2 size={15} /></button>
    </span>
  );
}

'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Trash2, Upload } from 'lucide-react';
import { urlArquivo } from '@/lib/arquivos';
import { fmtBRL } from '@/lib/format';

const ent = 'w-full border border-linha rounded-lg px-3 py-2 bg-papel text-sm';

// O prestador anexa a nota fiscal da ordem (PDF, JPG ou PNG).
export default function NotasFiscaisOS({ os, notas }) {
  const router = useRouter();
  const input = useRef(null);
  const [numero, setNumero] = useState('');
  const [valor, setValor] = useState('');
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const pode = ['conclusao_pendente', 'aprovada', 'paga'].includes(os.status);

  async function subir(e) {
    const arq = e.target.files?.[0];
    e.target.value = '';
    if (!arq) return;
    setErro(''); setOcupado(true);
    const fd = new FormData();
    fd.append('arquivo', arq); fd.append('numero', numero); fd.append('valor', valor);
    const res = await fetch(`/api/prestador/ordens/${os.id}/notas`, { method: 'POST', body: fd });
    const d = await res.json().catch(() => ({}));
    setOcupado(false);
    if (!res.ok) return setErro(d.error || 'Não foi possível enviar');
    setNumero(''); setValor('');
    router.refresh();
  }

  async function remover(id) {
    if (!window.confirm('Remover esta nota fiscal?')) return;
    const res = await fetch(`/api/prestador/ordens/${os.id}/notas?nota=${id}`, { method: 'DELETE' });
    if (!res.ok) { const d = await res.json().catch(() => ({})); setErro(d.error || 'Não foi possível remover'); return; }
    router.refresh();
  }

  return (
    <div className="card p-5 rounded-xl space-y-3">
      <h3 className="font-semibold">Nota fiscal</h3>
      {erro && <div className="text-sm bg-erro/10 border border-erro text-erro px-3 py-2 rounded-lg">{erro}</div>}
      {notas.length > 0 && (
        <ul className="space-y-2">
          {notas.map((n) => (
            <li key={n.id} className="flex items-center justify-between gap-2 text-sm border border-linha rounded-lg px-3 py-2">
              <a href={urlArquivo('ordens-arquivos', n.path)} target="_blank" rel="noreferrer" className="flex items-center gap-2 min-w-0 hover:underline"><FileText size={16} /> <span className="truncate">{n.numero ? `NF ${n.numero}` : n.nome_arquivo || 'Nota fiscal'}{n.valor ? ` · ${fmtBRL(n.valor)}` : ''}</span></a>
              {os.status !== 'paga' && <button type="button" onClick={() => remover(n.id)} className="text-erro" aria-label="Remover"><Trash2 size={15} /></button>}
            </li>
          ))}
        </ul>
      )}
      {pode ? (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="Número da NF" className={ent} />
            <input inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="Valor (R$)" className={ent} />
          </div>
          <button type="button" disabled={ocupado} onClick={() => input.current?.click()} className="border border-linha bg-white rounded-lg px-4 py-2 text-sm font-semibold flex items-center gap-2 disabled:opacity-50"><Upload size={16} /> {ocupado ? 'Enviando…' : 'Anexar nota fiscal'}</button>
          <input ref={input} type="file" accept="application/pdf,image/jpeg,image/png" onChange={subir} className="hidden" />
        </div>
      ) : <p className="text-sm text-marinho/50">Você poderá anexar a nota depois de concluir o serviço.</p>}
    </div>
  );
}

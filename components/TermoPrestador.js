'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TermoPrestador({ titulo, clausulas, versao, nomeEsperado }) {
  const router = useRouter();
  const [nome, setNome] = useState('');
  const [aceito, setAceito] = useState(false);
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);

  async function assinar(e) {
    e.preventDefault();
    setErro(''); setOcupado(true);
    const res = await fetch('/api/prestador/termo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome, aceito }) });
    const d = await res.json().catch(() => ({}));
    setOcupado(false);
    if (!res.ok) return setErro(d.error || 'Não foi possível registrar o aceite');
    router.push('/prestador/dashboard');
    router.refresh();
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <p className="text-xs uppercase tracking-wide text-marinho/50">Antes de começar · versão {versao}</p>
        <h1 className="text-2xl font-bold mt-1">{titulo}</h1>
        <p className="text-sm text-marinho/65 mt-1">Leia com atenção. Para usar o portal e receber ordens de serviço, é preciso concordar e assinar.</p>
      </div>
      <div className="card rounded-xl p-5 max-h-[55vh] overflow-y-auto space-y-4 text-sm leading-relaxed">
        {clausulas.map(([t, c]) => (<section key={t}><h2 className="font-semibold">{t}</h2><p className="text-marinho/80 mt-0.5">{c}</p></section>))}
      </div>
      <form onSubmit={assinar} className="card rounded-xl p-5 space-y-3">
        {erro && <div className="text-sm bg-erro/10 border border-erro text-erro px-3 py-2 rounded-lg">{erro}</div>}
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={aceito} onChange={(e) => setAceito(e.target.checked)} className="mt-1" /> Li o termo inteiro e concordo com todas as cláusulas, inclusive a garantia e a responsabilidade pelos serviços que executar.</label>
        <label className="block text-sm">
          <span className="block text-xs font-semibold text-marinho/70 mb-1">Para assinar, digite seu nome completo: <b>{nomeEsperado}</b></span>
          <input value={nome} onChange={(e) => setNome(e.target.value)} required className="w-full border border-linha rounded-lg px-3 py-2 bg-papel text-sm" placeholder="Seu nome completo" />
        </label>
        <button disabled={ocupado || !aceito || !nome.trim()} className="bg-verde text-white rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-50">{ocupado ? 'Registrando…' : 'Assinar e continuar'}</button>
        <p className="text-[11px] text-marinho/45">O aceite registra seu nome, data, hora, endereço de rede e dispositivo.</p>
      </form>
    </div>
  );
}

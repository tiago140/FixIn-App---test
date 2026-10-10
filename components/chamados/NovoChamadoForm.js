'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NovoChamadoForm({ clientes, base }) {
  const router = useRouter();
  const [tipo, setTipo] = useState('locatario');
  const [arquivos, setArquivos] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState(null);

  async function enviar(e) {
    e.preventDefault(); setEnviando(true); setErro('');
    const fd = new FormData(e.currentTarget);
    fd.set('tipo', tipo); fd.delete('arquivos'); arquivos.forEach((f) => fd.append('arquivos', f));
    const r = await fetch('/api/chamados/novo', { method: 'POST', body: fd });
    const j = await r.json().catch(() => ({}));
    setEnviando(false);
    if (!r.ok) { setErro(j.error || 'Erro ao abrir.'); return; }
    setOk(j);
  }
  const campo = 'w-full border border-linha rounded-md px-3 py-2 text-sm bg-white';
  if (ok) {
    const link = `${window.location.origin}/c/${ok.token}`;
    return (
      <div className="bg-white border border-linha rounded-lg p-6 max-w-xl">
        <h2 className="font-slab text-2xl font-bold text-marinho">Chamado {ok.numero} aberto</h2>
        <p className="text-sm text-marinho/70 mt-2">Se quiser que o solicitante acompanhe, envie este link a ele (aparece só agora; depois dá para gerar outro no chamado):</p>
        <div className="text-xs break-all bg-fundo border border-linha rounded p-2 mt-2">{link}</div>
        <div className="flex gap-2 mt-3">
          <button onClick={() => navigator.clipboard?.writeText(link)} className="border border-linha rounded-md px-3 py-1.5 text-sm">Copiar link</button>
          <button onClick={() => router.push(`${base}/${ok.id}`)} className="bg-marinho text-white rounded-md px-4 py-1.5 text-sm font-semibold">Abrir chamado</button>
        </div>
      </div>
    );
  }
  return (
    <form onSubmit={enviar} className="bg-white border border-linha rounded-lg p-5 space-y-4 max-w-xl">
      {clientes && (
        <div><label className="text-sm font-semibold text-marinho">Imobiliária *</label>
          <select name="cliente_id" required className={campo} defaultValue=""><option value="" disabled>Selecione…</option>{clientes.map((c) => <option key={c.id} value={c.id}>{c.nome_empresa}</option>)}</select></div>
      )}
      <div className="grid grid-cols-2 gap-2">
        {[['locatario', 'Locatário'], ['locador', 'Locador']].map(([v, r]) => (
          <button type="button" key={v} onClick={() => setTipo(v)} className={`rounded-md border px-3 py-2 text-sm font-semibold ${tipo === v ? 'bg-marinho text-white border-marinho' : 'border-linha text-marinho'}`}>{r}</button>
        ))}
      </div>
      <div><label className="text-sm font-semibold text-marinho">Nome do solicitante *</label><input name="nome" required maxLength={120} className={campo} /></div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div><label className="text-sm font-semibold text-marinho">E-mail</label><input name="email" type="email" className={campo} /></div>
        <div><label className="text-sm font-semibold text-marinho">Telefone</label><input name="telefone" className={campo} /></div>
      </div>
      <div><label className="text-sm font-semibold text-marinho">Endereço do imóvel *</label><input name="endereco" required className={campo} /></div>
      <div><label className="text-sm font-semibold text-marinho">Assunto *</label><input name="titulo" required maxLength={120} className={campo} /></div>
      <div><label className="text-sm font-semibold text-marinho">Descrição *</label><textarea name="descricao" required rows={4} className={campo} /></div>
      <div><label className="text-sm font-semibold text-marinho">Fotos (opcional)</label><input type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => setArquivos(Array.from(e.target.files || []))} className="block mt-1 text-sm" /></div>
      {erro && <p className="text-sm text-erro">{erro}</p>}
      <button disabled={enviando} className="w-full bg-marinho text-white font-semibold rounded-md px-4 py-2.5 disabled:opacity-50">{enviando ? 'Abrindo…' : 'Abrir chamado'}</button>
    </form>
  );
}

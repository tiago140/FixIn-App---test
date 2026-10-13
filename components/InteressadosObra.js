'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, HardHat, MessageCircle, Trash2, UserPlus } from 'lucide-react';

const ent = 'w-full border border-linha rounded-lg px-3 py-2 bg-papel text-sm';

// Imobiliária (e equipe FixIn): acompanha a obra e inclui quem vai recebê-la (nome, WhatsApp, e-mail).
// obras: [{ id, numero, iniciada_por, iniciada_em, link, interessados: [{ id, nome, email, whatsapp }] }]
export default function InteressadosObra({ obras, podeEditar = true }) {
  if (!obras?.length) return null;
  return <div className="space-y-4">{obras.map((o) => <Obra key={o.id} o={o} podeEditar={podeEditar} />)}</div>;
}

function Obra({ o, podeEditar }) {
  const router = useRouter();
  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [erro, setErro] = useState('');
  const [msg, setMsg] = useState('');
  const [wa, setWa] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [copiado, setCopiado] = useState(false);

  async function copiar() { try { await navigator.clipboard.writeText(o.link); setCopiado(true); setTimeout(() => setCopiado(false), 2000); } catch (e) {} }
  async function incluir(e) {
    e.preventDefault(); setErro(''); setMsg(''); setWa(null); setOcupado(true);
    const r = await fetch(`/api/imobiliaria/obra/${o.id}/interessados`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome, whatsapp, email }) });
    const d = await r.json().catch(() => ({}));
    setOcupado(false);
    if (!r.ok) return setErro(d.error || 'Não foi possível incluir.');
    setMsg(d.emailEnviado ? 'Incluído. O link foi enviado por e-mail.' : (email ? 'Incluído, mas o e-mail não saiu. Use o WhatsApp ou copie o link.' : 'Incluído.'));
    setWa(d.whatsappUrl || null);
    setNome(''); setWhatsapp(''); setEmail('');
    router.refresh();
  }
  async function remover(id) {
    if (!window.confirm('Remover este interessado da lista?')) return;
    await fetch(`/api/imobiliaria/obra/${o.id}/interessados?id=${id}`, { method: 'DELETE' });
    router.refresh();
  }
  const quando = o.iniciada_em ? new Date(o.iniciada_em).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '';

  return (
    <div className="card p-5 rounded-xl space-y-4">
      <div>
        <h3 className="font-semibold flex items-center gap-2"><HardHat size={18} /> Acompanhamento da obra {o.numero ? `· ${o.numero}` : ''}</h3>
        <p className="text-sm mt-1">{o.iniciada_por ? <>Obra iniciada por: <b>{o.iniciada_por}</b>{quando && ` em ${quando}`}</> : <span className="text-marinho/60">A obra ainda não começou. O link liga sozinho quando o prestador enviar a primeira foto de início.</span>}</p>
      </div>
      {o.link && (
        <div className="flex gap-2"><input readOnly value={o.link} className={`${ent} font-mono text-xs`} /><button type="button" onClick={copiar} className="border border-linha bg-white rounded-lg px-3 text-sm flex items-center gap-1"><Copy size={14} /> {copiado ? 'Copiado' : 'Copiar'}</button></div>
      )}
      {o.link && (
        <div>
          <div className="text-sm font-semibold mb-2">Quem acompanha</div>
          {o.interessados.length === 0 && <p className="text-sm text-marinho/55">Ninguém incluído ainda.</p>}
          <ul className="space-y-2">
            {o.interessados.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-3 border border-linha rounded-lg px-3 py-2 text-sm">
                <span><b>{i.nome}</b><br /><span className="text-marinho/60">{[i.whatsapp && `WhatsApp ${i.whatsapp}`, i.email].filter(Boolean).join(' · ')}</span></span>
                <span className="flex items-center gap-3 shrink-0">
                  {i.whatsapp && <a href={`https://wa.me/${i.whatsapp}?text=${encodeURIComponent(`Olá, ${i.nome}! Acompanhe a obra por este link: ${o.link}`)}`} target="_blank" rel="noreferrer" className="text-sucesso" title="Enviar o link no WhatsApp"><MessageCircle size={18} /></a>}
                  {podeEditar && <button type="button" onClick={() => remover(i.id)} className="text-erro" title="Remover"><Trash2 size={16} /></button>}
                </span>
              </li>
            ))}
          </ul>
          {podeEditar && (
            <form onSubmit={incluir} className="mt-4 grid sm:grid-cols-3 gap-2">
              <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome (locatário, locador…)" required className={ent} />
              <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="WhatsApp com DDD" inputMode="tel" className={ent} />
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail" type="email" className={ent} />
              <button disabled={ocupado} className="sm:col-span-3 bg-marinho text-white rounded-lg py-2 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"><UserPlus size={16} /> {ocupado ? 'Incluindo…' : 'Incluir e enviar o link'}</button>
            </form>
          )}
          {erro && <p className="text-sm text-erro mt-2">{erro}</p>}
          {msg && <p className="text-sm text-sucesso mt-2">{msg} {wa && <a href={wa} target="_blank" rel="noreferrer" className="underline font-semibold">Enviar no WhatsApp</a>}</p>}
        </div>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Pencil, Power, PowerOff } from 'lucide-react';

export default function ClientesLista({ clientes }) {
  return (
    <div>
      {clientes.map((c) => <Linha key={c.id} c={c} />)}
    </div>
  );
}

function Linha({ c }) {
  const router = useRouter();
  const [modo, setModo] = useState(null); // null | 'editar' | 'desativar'
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [form, setForm] = useState({ nome_empresa: c.nome_empresa || '', nome: c.nome === c.nome_empresa ? '' : c.nome || '', email: c.email || '', cnpj: c.cnpj || '' });
  const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));
  const desativada = c.ativo === false;

  async function enviar(corpo, aoOk) {
    setErro('');
    setAviso('');
    setCarregando(true);
    const res = await fetch(`/api/clientes/${c.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) });
    const d = await res.json().catch(() => ({}));
    setCarregando(false);
    if (!res.ok) return setErro(d.error || 'Não foi possível concluir.');
    setModo(null);
    setAviso(aoOk(d));
    router.refresh();
  }

  const botao = 'inline-flex items-center gap-1.5 text-sm font-semibold border border-linha bg-white rounded-lg px-3 py-1.5 hover:bg-papel disabled:opacity-50';

  return (
    <div className={`py-3 border-b border-linha ${desativada ? 'opacity-75' : ''}`}>
      <div className="flex justify-between gap-3 flex-wrap items-start">
        <Link href={`/master/clientes/${c.id}`} className="min-w-0 flex-1 hover:underline">
          <div className="font-semibold text-marinho flex items-center gap-2 flex-wrap">
            {c.nome_empresa}
            {desativada && <span className="text-[11px] font-bold uppercase tracking-wide rounded px-2 py-0.5 bg-erro text-white">Desativada</span>}
          </div>
          <div className="text-xs text-marinho/50">
            {c.nome} {c.email ? `· ${c.email}` : ''} {c.cnpj ? `· ${c.cnpj}` : ''}
          </div>
          <div className="text-xs text-marinho/50 mt-0.5">{c.qtd_usuarios} usuário(s) ativo(s) · {c.qtd_orcamentos} orçamento(s)</div>
        </Link>
        {modo === null && (
          <div className="flex gap-2 flex-wrap">
            <button type="button" className={botao} onClick={() => { setModo('editar'); setErro(''); setAviso(''); }}><Pencil size={15} /> Editar</button>
            {desativada ? (
              <button type="button" disabled={carregando} className={botao} onClick={() => enviar({ acao: 'reativar' }, (d) => `Imobiliária reativada. ${d.usuarios_liberados || 0} usuário(s) com acesso de volta.`)}><Power size={15} /> Reativar</button>
            ) : (
              <button type="button" className={`${botao} text-erro border-erro/40`} onClick={() => { setModo('desativar'); setErro(''); setAviso(''); }}><PowerOff size={15} /> Desativar</button>
            )}
          </div>
        )}
      </div>

      {modo === 'editar' && (
        <form onSubmit={(e) => { e.preventDefault(); enviar({ acao: 'editar', ...form }, () => 'Cadastro atualizado.'); }} className="mt-3 grid sm:grid-cols-2 gap-3 bg-papel/60 border border-linha rounded-lg p-3">
          <label className="block text-xs text-marinho/60">Nome da imobiliária
            <input value={form.nome_empresa} onChange={set('nome_empresa')} required className="mt-1 w-full border border-linha rounded px-3 py-2 bg-white text-sm text-marinho" />
          </label>
          <label className="block text-xs text-marinho/60">Responsável / contato
            <input value={form.nome} onChange={set('nome')} className="mt-1 w-full border border-linha rounded px-3 py-2 bg-white text-sm text-marinho" />
          </label>
          <label className="block text-xs text-marinho/60">E-mail do cadastro
            <input type="email" value={form.email} onChange={set('email')} className="mt-1 w-full border border-linha rounded px-3 py-2 bg-white text-sm text-marinho" />
          </label>
          <label className="block text-xs text-marinho/60">CNPJ
            <input value={form.cnpj} onChange={set('cnpj')} className="mt-1 w-full border border-linha rounded px-3 py-2 bg-white text-sm text-marinho" placeholder="00.000.000/0000-00" />
          </label>
          <div className="sm:col-span-2 flex gap-2 justify-end">
            <button type="button" className={botao} onClick={() => setModo(null)}>Cancelar</button>
            <button disabled={carregando} className="bg-marinho text-white text-sm font-semibold rounded-lg px-4 py-1.5 disabled:opacity-50">{carregando ? 'Salvando…' : 'Salvar alterações'}</button>
          </div>
        </form>
      )}

      {modo === 'desativar' && (
        <div className="mt-3 bg-erro/5 border border-erro/30 rounded-lg p-3 text-sm space-y-3">
          <div>
            Desativar <b>{c.nome_empresa}</b>?
            <ul className="list-disc ml-5 mt-1 text-marinho/70 space-y-0.5">
              <li>Os <b>{c.qtd_usuarios}</b> usuário(s) ativo(s) dela <b>perdem o acesso na hora</b>.</li>
              <li>Orçamentos, financeiro e histórico <b>continuam todos</b> no sistema.</li>
              <li>Ela deixa de aparecer ao criar orçamento, visita ou usuário, e não recebe mais lembretes automáticos.</li>
              <li>Dá para reativar a qualquer momento: os acessos voltam sozinhos (menos de quem já estava desativado antes).</li>
            </ul>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" className={botao} onClick={() => setModo(null)}>Cancelar</button>
            <button disabled={carregando} onClick={() => enviar({ acao: 'desativar' }, (d) => `Imobiliária desativada. ${d.usuarios_bloqueados || 0} usuário(s) bloqueado(s).`)} className="bg-erro text-white text-sm font-semibold rounded-lg px-4 py-1.5 disabled:opacity-50">{carregando ? 'Desativando…' : 'Sim, desativar'}</button>
          </div>
        </div>
      )}

      {erro && <div className="mt-2 text-xs bg-erro/10 border border-erro text-erro px-3 py-2 rounded">{erro}</div>}
      {aviso && <div className="mt-2 text-xs text-sucesso">{aviso}</div>}
    </div>
  );
}

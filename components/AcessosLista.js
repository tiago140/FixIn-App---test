'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, KeyRound, UserX, UserCheck, Trash2 } from 'lucide-react';
import { SENHA_MIN, gerarSenha } from '@/lib/senha';

export default function AcessosLista({ equipe, imobiliarias, outros, meuId, souDono }) {
  return (
    <div>
      <Secao
        titulo="Equipe FixIn (acesso total)"
        vazio={souDono ? 'Nenhum funcionário cadastrado ainda. Use "Novo funcionário".' : 'Nenhum funcionário cadastrado.'}
        lista={equipe}
        meuId={meuId}
        souDono={souDono}
      />
      <Secao titulo="Imobiliárias" vazio="Nenhum acesso de imobiliária ainda." lista={imobiliarias} meuId={meuId} souDono={souDono} />
      {outros.length > 0 && <Secao titulo="Prestadores" lista={outros} meuId={meuId} souDono={souDono} />}
    </div>
  );
}

function Secao({ titulo, lista, vazio, meuId, souDono }) {
  return (
    <section className="mb-8">
      <h2 className="font-semibold text-xl mb-1">
        {titulo} <span className="font-normal text-marinho/50">({lista.length})</span>
      </h2>
      {lista.length === 0 ? (
        <div className="border border-dashed border-linha p-6 text-center text-sm text-marinho/50">{vazio}</div>
      ) : (
        lista.map((a) => <Linha key={a.id} a={a} meuId={meuId} souDono={souDono} />)
      )}
    </section>
  );
}

function Linha({ a, meuId, souDono }) {
  const router = useRouter();
  const [modo, setModo] = useState(null); // null | 'senha' | 'desativar' | 'editar' | 'excluir'
  const [form, setForm] = useState({ nome_completo: a.nome_completo || '', email: a.email || '', cpf: a.cpf || '', subrole: a.subrole === 'operacional' ? 'operacional' : 'admin' });
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [carregando, setCarregando] = useState(false);

  const eu = a.id === meuId;
  const ehMaster = a.role === 'master';
  const podeGerenciar = ehMaster ? souDono && !a.dono : true; // master: só o dono gerencia; e ninguém mexe no dono
  const podeSenha = podeGerenciar && !a.dono;
  const podeDesativar = podeGerenciar && !a.dono && !eu;
  const podeEditar = ehMaster ? souDono : true; // o dono edita qualquer um (inclusive ele mesmo); funcionário master só mexe em imobiliária
  const podeExcluir = podeGerenciar && !a.dono && !eu;
  const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));

  async function enviar(corpo, textoOk, metodo = 'PATCH') {
    setErro('');
    setAviso('');
    setCarregando(true);
    const res = await fetch(`/api/acessos/${a.id}`, { method: metodo, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo || {}) });
    setCarregando(false);
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErro(d.error || 'Não foi possível concluir.');
      return;
    }
    setModo(null);
    setSenha('');
    setAviso(textoOk);
    router.refresh();
  }

  const detalhe = ehMaster
    ? 'Master · acesso total'
    : `${a.subrole === 'operacional' ? 'Operacional' : 'Administrador'}${a.clientes?.nome_empresa ? ` · ${a.clientes.nome_empresa}` : ''}`;

  return (
    <div className={`py-3 border-b border-linha ${a.ativo === false ? 'opacity-70' : ''}`}>
      <div className="flex justify-between gap-3 flex-wrap">
        <div>
          <div className="font-semibold flex items-center gap-2 flex-wrap">
            {a.nome_completo}
            {eu && <span className="text-[10px] font-normal text-marinho/50">(você)</span>}
            {a.dono && <span className="tag bg-marinho text-white">Dono</span>}
            {a.ativo === false && <span className="tag bg-erro/15 text-erro">Desativado</span>}
          </div>
          <div className="text-xs text-marinho/50">
            {detalhe} · {a.email}
          </div>
        </div>

        {modo === null && (podeEditar || podeSenha || podeDesativar || podeExcluir) && (
          <div className="flex gap-2 items-start flex-wrap justify-end">
            {podeEditar && (
              <button onClick={() => { setModo('editar'); setErro(''); setAviso(''); }} className="text-xs border border-linha bg-white rounded px-2.5 py-1 hover:bg-papel inline-flex items-center gap-1">
                <Pencil size={12} /> Editar
              </button>
            )}
            {podeSenha && (
              <button onClick={() => { setModo('senha'); setErro(''); setAviso(''); }} className="text-xs border border-linha bg-white rounded px-2.5 py-1 hover:bg-papel">
                Trocar senha
              </button>
            )}
            {podeDesativar && (
              a.ativo === false ? (
                <button disabled={carregando} onClick={() => enviar({ acao: 'reativar' }, 'Acesso reativado.')} className="text-xs border border-linha bg-white rounded px-2.5 py-1 hover:bg-papel">
                  Reativar
                </button>
              ) : (
                <button onClick={() => { setModo('desativar'); setErro(''); setAviso(''); }} className="text-xs border border-erro/40 text-erro bg-white rounded px-2.5 py-1 hover:bg-erro/5">
                  Desativar
                </button>
              )
            )}
            {podeExcluir && (
              <button onClick={() => { setModo('excluir'); setErro(''); setAviso(''); }} className="text-xs border border-erro/40 text-erro bg-white rounded px-2.5 py-1 hover:bg-erro/5 inline-flex items-center gap-1">
                <Trash2 size={12} /> Excluir
              </button>
            )}
          </div>
        )}
      </div>

      {modo === 'editar' && (
        <form onSubmit={(e) => { e.preventDefault(); enviar({ acao: 'editar', ...form }, 'Cadastro atualizado.'); }} className="mt-3 grid sm:grid-cols-2 gap-3 bg-papel/60 border border-linha rounded-lg p-3">
          <label className="block text-xs text-marinho/60">Nome completo
            <input value={form.nome_completo} onChange={set('nome_completo')} required className="mt-1 w-full border border-linha rounded px-3 py-2 bg-white text-sm text-marinho" />
          </label>
          <label className="block text-xs text-marinho/60">E-mail (é o login)
            <input type="email" value={form.email} onChange={set('email')} required className="mt-1 w-full border border-linha rounded px-3 py-2 bg-white text-sm text-marinho" />
          </label>
          <label className="block text-xs text-marinho/60">CPF (opcional)
            <input value={form.cpf} onChange={set('cpf')} className="mt-1 w-full border border-linha rounded px-3 py-2 bg-white text-sm text-marinho" />
          </label>
          {!ehMaster && (
            <label className="block text-xs text-marinho/60">Perfil na imobiliária
              <select value={form.subrole} onChange={set('subrole')} className="mt-1 w-full border border-linha rounded px-3 py-2 bg-white text-sm text-marinho">
                <option value="admin">Administrador — vê tudo, inclusive valores e a equipe</option>
                <option value="operacional">Operacional — só vê valor do que ela pediu</option>
              </select>
            </label>
          )}
          <div className="sm:col-span-2 flex gap-2 justify-end">
            <button type="button" onClick={() => setModo(null)} className="text-xs border border-linha bg-white rounded px-3 py-1.5">Cancelar</button>
            <button disabled={carregando} className="text-xs bg-marinho text-white rounded px-4 py-1.5 font-semibold disabled:opacity-50">{carregando ? 'Salvando…' : 'Salvar alterações'}</button>
          </div>
        </form>
      )}

      {modo === 'excluir' && (a.tem_historico ? (
        <div className="mt-2 flex gap-2 items-center flex-wrap text-sm">
          <span><b>{a.nome_completo}</b> já tem histórico no sistema (orçamentos, mensagens, Auditoria…). Excluir apagaria o registro de quem fez o quê, por isso só dá para <b>desativar</b> o acesso.</span>
          {a.ativo !== false && <button onClick={() => setModo('desativar')} className="text-xs bg-erro text-white rounded px-3 py-1">Desativar acesso</button>}
          <button onClick={() => setModo(null)} className="text-xs text-marinho/60 underline">Fechar</button>
        </div>
      ) : (
        <div className="mt-2 flex gap-2 items-center flex-wrap text-sm">
          <span>Excluir <b>{a.nome_completo}</b> ({a.email}) de forma definitiva? Essa pessoa nunca usou o sistema. <b>Não dá para desfazer.</b></span>
          <button disabled={carregando} onClick={() => enviar({}, 'Usuário excluído.', 'DELETE')} className="text-xs bg-erro text-white rounded px-3 py-1">Sim, excluir definitivamente</button>
          <button onClick={() => setModo(null)} className="text-xs text-marinho/60 underline">Cancelar</button>
        </div>
      ))}

      {modo === 'senha' && (
        <div className="mt-2 flex gap-2 items-center flex-wrap">
          <input
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder={`Nova senha (mín. ${SENHA_MIN})`}
            className="border border-linha rounded px-2.5 py-1 text-sm bg-white w-56"
          />
          <button type="button" onClick={() => setSenha(gerarSenha())} className="text-xs underline text-marinho/70">Gerar senha</button>
          <button disabled={carregando || senha.length < SENHA_MIN} onClick={() => enviar({ acao: 'redefinir_senha', senha }, 'Senha alterada. Avise a pessoa por fora (WhatsApp, telefone).')} className="text-xs bg-marinho text-white rounded px-3 py-1 disabled:opacity-40">
            Salvar senha
          </button>
          <button onClick={() => { setModo(null); setSenha(''); }} className="text-xs text-marinho/60 underline">Cancelar</button>
        </div>
      )}

      {modo === 'desativar' && (
        <div className="mt-2 flex gap-2 items-center flex-wrap text-sm">
          <span>Desativar <b>{a.nome_completo}</b>? A pessoa perde o acesso na hora. O histórico dela continua.</span>
          <button disabled={carregando} onClick={() => enviar({ acao: 'desativar' }, 'Acesso desativado.')} className="text-xs bg-erro text-white rounded px-3 py-1">Sim, desativar</button>
          <button onClick={() => setModo(null)} className="text-xs text-marinho/60 underline">Cancelar</button>
        </div>
      )}

      {erro && <div className="mt-2 text-xs text-erro">{erro}</div>}
      {aviso && <div className="mt-2 text-xs text-sucesso">{aviso}</div>}
    </div>
  );
}

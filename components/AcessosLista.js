'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
      <h2 className="font-semibold text-sm mb-1">
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
  const [modo, setModo] = useState(null); // null | 'senha' | 'desativar'
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [carregando, setCarregando] = useState(false);

  const eu = a.id === meuId;
  const ehMaster = a.role === 'master';
  const podeGerenciar = ehMaster ? souDono && !a.dono : true; // master: só o dono gerencia; e ninguém mexe no dono
  const podeSenha = podeGerenciar && !a.dono;
  const podeDesativar = podeGerenciar && !a.dono && !eu;

  async function enviar(corpo, textoOk) {
    setErro('');
    setAviso('');
    setCarregando(true);
    const res = await fetch(`/api/acessos/${a.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) });
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

        {modo === null && (podeSenha || podeDesativar) && (
          <div className="flex gap-2 items-start">
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
          </div>
        )}
      </div>

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

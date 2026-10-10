'use client';
import { useState } from 'react';
import { APPS_SCRIPT } from '@/lib/backupTextos';

export default function BackupCard({ drivePronto, emailPronto, ultimo }) {
  const [mostrar, setMostrar] = useState(false);
  return (
    <div className="card p-5 space-y-3 max-w-2xl mt-6">
      <h2 className="font-semibold text-sm">Backup completo</h2>
      <p className="text-sm text-marinho/70">Pacote (.zip) com todos os dados, arquivos, estrutura do banco e o script de restauração. Um programador (ou o Claude) consegue colocar o sistema de pé de novo só com ele.</p>
      <div className="text-sm space-y-1">
        <div>Backup automático diário: <strong>{drivePronto ? 'ligado — enviando ao seu Google Drive' : 'ligado, mas sem destino'}</strong></div>
        {!drivePronto && <div className="text-alerta">Falta ligar o Google Drive (passo a passo abaixo).{emailPronto ? ' Enquanto isso, o backup vai por e-mail.' : ' O envio de e-mail também não está configurado.'}</div>}
        {ultimo && <div className="text-marinho/60">Último automático: {ultimo}</div>}
      </div>
      <a href="/api/backup" className="inline-block bg-marinho text-white rounded px-4 py-2 text-sm font-semibold">Baixar backup agora</a>
      <div>
        <button onClick={() => setMostrar(!mostrar)} className="text-sm underline text-marinho">{mostrar ? 'Esconder' : 'Como ligar o envio ao Google Drive'}</button>
        {mostrar && (
          <ol className="list-decimal pl-5 text-sm space-y-2 mt-2">
            <li>Abra <strong>script.google.com</strong> logado na conta do Drive onde quer os backups e crie um projeto novo.</li>
            <li>Apague o conteúdo e cole o código abaixo. Troque a frase em <code>SEGREDO</code> por uma frase longa só sua.</li>
            <li>Clique em <strong>Implantar &gt; Nova implantação &gt; App da Web</strong>. Executar como: <em>você</em>. Quem tem acesso: <em>Qualquer pessoa</em>. Autorize e copie a URL.</li>
            <li>No Vercel (projeto do sistema &gt; Settings &gt; Environment Variables) crie <code>BACKUP_DRIVE_URL</code> (a URL) e <code>BACKUP_DRIVE_SEGREDO</code> (a mesma frase). Faça um novo deploy.</li>
            <li>Pronto: todo dia o pacote aparece na pasta <strong>FixIn - Backups</strong> do seu Drive (guarda os últimos 30).</li>
          </ol>
        )}
        {mostrar && <pre className="text-xs bg-fundo border border-linha rounded p-3 mt-2 overflow-x-auto whitespace-pre-wrap">{APPS_SCRIPT}</pre>}
      </div>
    </div>
  );
}

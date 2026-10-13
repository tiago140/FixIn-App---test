import { urlArquivo } from '@/lib/arquivos';

// Miniaturas que abrem a foto inteira em outra aba. Serve para equipe e prestador (a permissão é conferida ao abrir).
export default function GaleriaFotosOS({ fotos, vazio = 'Nenhuma foto ainda.' }) {
  if (!fotos?.length) return <p className="text-sm text-marinho/50">{vazio}</p>;
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
      {fotos.map((f) => (
        <a key={f.id} href={urlArquivo('ordens-arquivos', f.path)} target="_blank" rel="noreferrer" className="block relative group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={urlArquivo('ordens-arquivos', f.path)} alt={f.legenda || f.tipo} loading="lazy" className="w-full aspect-square object-cover rounded-lg border border-linha" />
          <span className="absolute left-1 top-1 text-[10px] font-bold uppercase bg-marinho/80 text-white rounded px-1.5 py-0.5">{f.tipo === 'antes' ? 'Antes' : f.tipo === 'depois' ? 'Depois' : 'Reprovado'}</span>
          {f.legenda && <span className="block text-[11px] text-marinho/60 mt-0.5 truncate">{f.legenda}</span>}
        </a>
      ))}
    </div>
  );
}

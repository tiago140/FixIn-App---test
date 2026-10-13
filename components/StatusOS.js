import { STATUS_OS } from '@/lib/ordensStatus';

export default function StatusOS({ status }) {
  const s = STATUS_OS[status] || { rotulo: status, cor: 'bg-marinho/10 text-marinho' };
  return <span className={`inline-block text-[11px] font-bold rounded-full px-2.5 py-1 whitespace-nowrap ${s.cor}`}>{s.rotulo}</span>;
}

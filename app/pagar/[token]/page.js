import QRCode from 'qrcode';
import { createAdminClient } from '@/lib/supabase/admin';
import { dadosPagamento, linkTikpag, tikpagCheckoutBase, urlTikpagDoOrcamento, MAX_PARCELAS_TIKPAG, MAX_PARTES, MIN_PARTE } from '@/lib/pagamentoOrcamento';
import { fmtBRL, fmtDate } from '@/lib/format';
import { simularParcelas } from '@/lib/infinitepay';
import DividirPagamento from '@/components/DividirPagamento';
import BotaoCopiar from '@/components/BotaoCopiar';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Pagamento do orçamento', robots: { index: false, follow: false }, referrer: 'no-referrer' };

export default async function PaginaPagar({ params }) {
  const token = String(params.token || '');
  const d = /^[0-9a-f-]{36}$/i.test(token) ? await dadosPagamento(createAdminClient(), token) : { estado: 'indisponivel' };
  const tik = d.estado === 'ok' ? linkTikpag(d) : null;
  const qr = d.estado === 'ok' && d.pix ? await QRCode.toDataURL(d.pix, { margin: 1, width: 280 }) : null;
  return (
    <main className="min-h-screen bg-fundo py-8 px-4">
      <div className="max-w-lg mx-auto bg-white rounded-2xl shadow p-6 space-y-4">
        <div className="text-xs uppercase tracking-wide text-marinho/50">FixIn Reformas · Pagamento</div>
        {d.numero && <h1 className="text-xl font-semibold text-marinho">Orçamento {d.numero}<span className="block text-sm font-normal text-marinho/60">{d.endereco}</span></h1>}
        {d.estado === 'aguardando_aprovacao' && <p className="text-marinho/80">O pagamento é liberado depois que o orçamento for aprovado. Aprove pelo sistema ou fale com a FixIn.</p>}
        {d.estado === 'pago' && <p className="text-emerald-700 font-medium">Este orçamento já está pago. Obrigado!</p>}
        {d.estado === 'indisponivel' && <p className="text-marinho/80">Não foi possível abrir o pagamento agora. Fale com a FixIn para receber um novo link.</p>}
        {d.estado === 'ok' && (<>
          <div className="text-3xl font-bold text-marinho">{fmtBRL(d.valor)}<span className="block text-xs font-normal text-marinho/60">{d.parcela === 'entrada' ? 'Entrada de 50% · ' : d.parcela === 'saldo' ? 'Saldo · ' : ''}Vence em {fmtDate(d.vencimento)}</span></div>
          {d.faltaDepois > 0 && <p className="text-sm text-marinho/70 bg-papel rounded-lg p-3">Pagamento combinado em duas partes. Os outros {fmtBRL(d.faltaDepois)} (50%) ficam para {fmtDate(d.saldoVence)}, no mesmo link.</p>}
          {d.provedor === 'infinitepay' && d.partes && (<section className="border rounded-xl p-4 space-y-3">
            <img src="/infinitepay-logo.png" alt="InfinitePay" width={150} className="mx-auto" />
            <p className="text-sm text-marinho/70 text-center">Pagamento dividido em {d.partes.length} partes. Pague cada uma com Pix ou cartão.</p>
            {d.partes.map((p, i) => (<a key={i} href={p.url} className="block rounded-lg bg-marinho text-white py-3 text-center font-semibold">Parte {i + 1} · {fmtBRL(p.valor)}</a>))}
          </section>)}
          {d.provedor === 'infinitepay' && !d.partes && d.linkPagamento && (<section className="border rounded-xl p-4 text-center space-y-3">
            <img src="/infinitepay-logo.png" alt="InfinitePay" width={150} className="mx-auto" />
            <a href={d.linkPagamento} className="block rounded-lg bg-marinho text-white py-3 font-semibold">Pagar com Pix ou cartão em até 12x</a>
            <p className="text-xs text-marinho/60">Pix sem taxa. No cartão, a taxa do parcelamento é repassada; o valor exato aparece no checkout.</p>
            <details className="text-left text-sm">
              <summary className="cursor-pointer text-marinho/80 font-medium">Ver estimativa no cartão</summary>
              <table className="w-full mt-2 text-xs"><tbody>
                {simularParcelas(d.valor).map((p) => (<tr key={p.n} className="border-t"><td className="py-1">{p.n}x de {fmtBRL(p.parcela)}</td><td className="py-1 text-right text-marinho/60">total aprox. {fmtBRL(p.total)}</td></tr>))}
              </tbody></table>
            </details>
          </section>)}
          {d.provedor === 'infinitepay' && d.alvoTotal > 0 && <DividirPagamento token={token} total={d.alvoTotal} max={MAX_PARTES} min={MIN_PARTE} dividido={!!d.partes} />}
          {qr && (<section className="border rounded-xl p-4 text-center space-y-2">
            <h2 className="font-semibold text-marinho">Pix</h2>
            <img src={qr} alt="QR code Pix" width={220} height={220} className="mx-auto" />
            <BotaoCopiar texto={d.pix} rotulo="Copiar Pix copia e cola" />
          </section>)}
          {(d.linhaDigitavel || d.boletoUrl) && (<section className="border rounded-xl p-4 space-y-2">
            <h2 className="font-semibold text-marinho">Boleto</h2>
            {d.linhaDigitavel && <p className="text-sm break-all font-mono">{d.linhaDigitavel}</p>}
            {d.linhaDigitavel && <BotaoCopiar texto={d.linhaDigitavel} rotulo="Copiar linha digitável" />}
            {d.boletoUrl && <a href={d.boletoUrl} target="_blank" rel="noopener noreferrer" className="block text-center rounded-lg border border-marinho text-marinho py-2 text-sm font-medium">Baixar boleto (PDF)</a>}
          </section>)}
          {d.provedor === 'infinitepay' && tikpagCheckoutBase() && (<a href={urlTikpagDoOrcamento(token)} className="block text-center rounded-lg border border-marinho text-marinho py-3 font-semibold">Parcelar em até {MAX_PARCELAS_TIKPAG}x com a TikPag</a>)}
          {tik && (<a href={tik} target="_blank" rel="noopener noreferrer" className="block text-center rounded-lg bg-marinho text-white py-3 font-semibold">Parcelar em até {MAX_PARCELAS_TIKPAG}x com a TikPag</a>)}
          {d.faturaUrl && d.provedor !== 'infinitepay' && <a href={d.faturaUrl} target="_blank" rel="noopener noreferrer" className="block text-center text-sm text-marinho/70 underline">Pagar com cartão ou outras formas (fatura Asaas)</a>}
        </>)}
      </div>
    </main>
  );
}

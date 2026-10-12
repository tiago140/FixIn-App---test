import { redirect } from 'next/navigation';

// Contas a pagar e receber agora é a página Financeiro.
export default function LancamentosPage() {
  redirect('/master/financeiro');
}

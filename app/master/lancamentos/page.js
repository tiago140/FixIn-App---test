import { redirect } from 'next/navigation';

// Contas agora fica dentro da página Financeiro (uma página só).
export default function LancamentosPage() {
  redirect('/master/financeiro#contas');
}

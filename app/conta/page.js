import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/getProfile';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import TrocarSenhaForm from '@/components/TrocarSenhaForm';
import BackupCard from '@/components/BackupCard';
import { createAdminClient } from '@/lib/supabase/admin';
import { fmtDataHoraSP } from '@/lib/format';
import MfaConta from '@/components/MfaConta';
import TesteEmail from '@/components/TesteEmail';
import { statusEnvioEmail } from '@/lib/email';
import { MASTER_TABS, imobiliariaTabs } from '@/lib/navTabs';

export const dynamic = 'force-dynamic';

export default async function MinhaConta() {
  const { user, profile } = await getProfile();
  if (!user || !profile) redirect('/login');

  const master = profile.role === 'master';
  const tipo = master ? (profile.dono ? 'Dono' : 'Funcionário FixIn (master)') : profile.subrole === 'operacional' ? 'Imobiliária · operacional' : 'Imobiliária · administrador';

  let ultimoBackup = null;
  if (profile.dono) {
    try {
      const { data } = await createAdminClient().from('auditoria').select('criado_em, detalhe').eq('acao', 'Backup automático').order('criado_em', { ascending: false }).limit(1).maybeSingle();
      if (data) ultimoBackup = `${fmtDataHoraSP(data.criado_em)} — ${data.detalhe}`;
    } catch (e) {}
  }
  const emailPronto = statusEnvioEmail().ok;
  const drivePronto = !!(process.env.BACKUP_DRIVE_URL && process.env.BACKUP_DRIVE_SEGREDO);

  return (
    <AppShell profile={profile} tabs={master ? MASTER_TABS : imobiliariaTabs(profile)} homeHref={master ? '/master/dashboard' : '/imobiliaria/dashboard'}>
      <PageHeader
        icone="conta"
        titulo="Minha conta"
        subtitulo={`${profile.nome_completo} · ${profile.email || user.email} · ${tipo}`}
      />
      <TrocarSenhaForm />
      <MfaConta />
      {profile.dono && <BackupCard drivePronto={drivePronto} emailPronto={emailPronto} ultimo={ultimoBackup} />}
      {master && <TesteEmail configuracao={statusEnvioEmail()} />}
    </AppShell>
  );
}

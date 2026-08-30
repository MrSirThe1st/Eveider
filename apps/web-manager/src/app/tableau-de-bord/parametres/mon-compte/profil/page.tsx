import { PageFrame } from '@eveider/ui';
import { AccountProfileForm } from '@/components/account-profile-form';
import { requireWebRole } from '@/lib/require-web-role';

export default async function AdminAccountProfilePage() {
  const profile = await requireWebRole(['admin']);

  return (
    <PageFrame
      title="Profil"
      description="Votre nom et votre e-mail."
      layout="standard"
    >
      <AccountProfileForm fullName={profile.fullName ?? ''} loginEmail={profile.email} />
    </PageFrame>
  );
}

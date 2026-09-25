import { PageFrame } from '@eveider/ui';
import { AccountProfileForm } from '@/components/account-profile-form';
import { requireBusinessPageContext } from '@/server/business';

export default async function OrganizationAccountProfilePage() {
  const { profile } = await requireBusinessPageContext();

  return (
    <PageFrame
      title="Profil"
      description="Votre nom d’utilisateur. L’e-mail de connexion n’est pas modifiable ici."
      layout="standard"
    >
      <AccountProfileForm fullName={profile.fullName ?? ''} loginEmail={profile.email} />
    </PageFrame>
  );
}

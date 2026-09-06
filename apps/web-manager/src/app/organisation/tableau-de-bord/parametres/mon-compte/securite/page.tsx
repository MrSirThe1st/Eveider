import { PageFrame } from '@eveider/ui';
import { AccountSecurityForm } from '@/components/account-security-form';
import { requireBusinessPageContext } from '@/server/business';

export default async function OrganizationSecuritySettingsPage() {
  await requireBusinessPageContext();

  return (
    <PageFrame
      title="Sécurité"
      description="Modifiez le mot de passe de votre compte."
      layout="standard"
    >
      <AccountSecurityForm />
    </PageFrame>
  );
}

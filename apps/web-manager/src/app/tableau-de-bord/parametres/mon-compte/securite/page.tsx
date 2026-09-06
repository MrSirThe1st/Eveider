import { PageFrame } from '@eveider/ui';
import { AccountSecurityForm } from '@/components/account-security-form';
import { requireWebRole } from '@/lib/require-web-role';

export default async function AdminSecuritySettingsPage() {
  await requireWebRole(['admin']);

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

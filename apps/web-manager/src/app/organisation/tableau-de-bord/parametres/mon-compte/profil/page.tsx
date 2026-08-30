import { hasBusinessPermission } from '@eveider/domain';
import { PageFrame } from '@eveider/ui';
import { AccountProfileForm } from '@/components/account-profile-form';
import { loadBusinessSettingsPageData, requireBusinessPageContext } from '@/server/business';

export default async function OrganizationAccountProfilePage() {
  const { profile } = await requireBusinessPageContext();
  const canViewAccessCode = hasBusinessPermission(profile.userRole, 'settings');

  let accessCode: string | null = null;
  if (canViewAccessCode && profile.businessId) {
    const { settings } = await loadBusinessSettingsPageData(profile.businessId);
    accessCode = settings?.accessCode ?? null;
  }

  return (
    <PageFrame
      title="Profil"
      description="Votre nom et votre e-mail."
      layout="standard"
    >
      <AccountProfileForm
        fullName={profile.fullName ?? ''}
        loginEmail={profile.email}
        accessCode={accessCode}
        showAccessCode={canViewAccessCode}
      />
    </PageFrame>
  );
}

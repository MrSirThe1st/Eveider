import { deriveOrganizationVerificationStatus } from '@eveider/domain';
import { PageFrame } from '@eveider/ui';
import { OnboardingWizard } from '@/components/onboarding-wizard';
import type { OnboardingSummary } from '@/hooks/queries/use-onboarding-summary-query';
import { loadVerificationPageData, requireBusinessPermission } from '@/server/business';

export default async function OrganizationVerificationPage() {
  const { profile } = await requireBusinessPermission('settings');
  const { summary, lockerList } = await loadVerificationPageData(profile.businessId);

  if (!summary) {
    return (
      <PageFrame title="Vérification" description="Dossier KYC optionnel." layout="standard">
        <p>Organisation introuvable.</p>
      </PageFrame>
    );
  }

  const verificationStatus = deriveOrganizationVerificationStatus(summary.verifications[0]?.status);

  return (
    <PageFrame
      title="Vérification"
      description="Dossier optionnel pour faire certifier votre organisation. Vous pouvez utiliser la plateforme sans être vérifié."
      layout="standard"
    >
      <OnboardingWizard
        initialSummary={summary as OnboardingSummary}
        verificationStatus={verificationStatus}
        availableLockers={lockerList.map((locker) => ({
          id: locker.id,
          name: locker.name,
          address: locker.address,
        }))}
      />
    </PageFrame>
  );
}

import { notFound } from 'next/navigation';
import { OnboardingWizard } from '@/components/onboarding-wizard';
import type { OnboardingSummary } from '@/hooks/queries/use-onboarding-summary-query';
import { requireBusinessPageContext, loadOnboardingPageData } from '@/server/business';

export default async function OnboardingPage() {
  const { profile } = await requireBusinessPageContext();
  const { summary, lockerList } = await loadOnboardingPageData(profile.businessId);

  if (!summary) {
    notFound();
  }

  return (
    <main style={{ minHeight: '100vh', background: '#F8FAFC' }}>
      <OnboardingWizard
        initialSummary={summary as OnboardingSummary}
        availableLockers={lockerList.map((l) => ({
          id: l.id,
          name: l.name,
          address: l.address,
          code: l.code,
        }))}
      />
    </main>
  );
}

import { createDataAccessContext, createRepositories } from '@eveider/data-access';
import type { DataAccessContext } from '@eveider/data-access';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { redirect } from 'next/navigation';

export type BusinessPageContext = {
  authId: string;
  profile: {
    id: string;
    businessId: string;
    role: string;
    email: string | null;
    fullName: string | null;
  };
  ctx: DataAccessContext;
};

export async function requireBusinessPageContext(): Promise<BusinessPageContext> {
  const current = await getCurrentUser();
  if (!current) {
    redirect('/connexion');
  }

  if (!current.profile.businessId) {
    redirect('/inscription');
  }

  return {
    authId: current.authUser.id,
    profile: {
      id: current.profile.id,
      businessId: current.profile.businessId,
      role: current.profile.role,
      email: current.profile.email,
      fullName: current.profile.fullName,
    },
    ctx: createDataAccessContext('business', {
      userId: current.profile.id,
      businessId: current.profile.businessId,
    }),
  };
}

export async function loadBusinessDashboard(businessId: string, ctx: DataAccessContext) {
  const { businesses, stats } = createRepositories();
  const [business, analytics] = await Promise.all([
    businesses.findById(ctx, businessId),
    stats.getBusinessAnalytics(ctx, businessId),
  ]);

  if (!business) {
    return null;
  }

  return {
    business,
    analytics,
  };
}

export async function loadBusinessSettingsPageData(businessId: string) {
  const { businessOnboarding, lockers } = createRepositories();
  const [settings, lockerList] = await Promise.all([
    businessOnboarding.getSettingsSnapshot(businessId),
    lockers.listActivePickerOptions(),
  ]);

  return { settings, lockerList };
}

export async function loadBusinessBillingPageData(businessId: string) {
  const { businessOnboarding } = createRepositories();
  return businessOnboarding.getBillingSnapshot(businessId);
}

export async function loadOnboardingPageData(businessId: string) {
  const { businessOnboarding, lockers } = createRepositories();
  const [summary, lockerList] = await Promise.all([
    businessOnboarding.getOnboardingSummary(businessId),
    lockers.listActiveWithAvailability(),
  ]);

  return { summary, lockerList };
}

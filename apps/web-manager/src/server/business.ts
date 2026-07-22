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
  const { businessOnboarding, parcels } = createRepositories();
  const summary = await businessOnboarding.getOnboardingSummary(businessId);

  if (!summary) {
    return null;
  }

  const parcelList = await parcels.listForBusiness(ctx, businessId);
  const deliveredCount = parcelList.filter((p) => p.status === 'collected').length;
  const pendingCount = parcelList.filter((p) => p.status !== 'collected').length;

  return {
    summary,
    parcelList,
    deliveredCount,
    pendingCount,
  };
}

export async function loadOnboardingPageData(businessId: string) {
  const { businessOnboarding, lockers } = createRepositories();
  const [summary, lockerList] = await Promise.all([
    businessOnboarding.getOnboardingSummary(businessId),
    lockers.listActiveWithAvailability(),
  ]);

  return { summary, lockerList };
}

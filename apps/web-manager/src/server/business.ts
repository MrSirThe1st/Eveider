import { createDataAccessContext, createRepositories } from '@eveider/data-access';
import type { DataAccessContext } from '@eveider/data-access';
import type { BusinessPermission, OrganizationRole } from '@eveider/domain';
import { hasBusinessPermission, hasOrganizationWebAccess, isOrganizationWebRole } from '@eveider/domain';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { WEB_ROUTES } from '@/lib/auth-routing';
import { pickOrganizationMembership } from '@/lib/session';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const ORGANIZATION_COOKIE = 'eveider-organization-id';

export type BusinessPageContext = {
  authId: string;
  profile: {
    id: string;
    businessId: string;
    role: string;
    userRole: OrganizationRole | null;
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

  if (
    !hasOrganizationWebAccess(
      current.memberships.map((membership) => ({
        organizationId: membership.businessId,
        role: membership.role,
        isPlatformOrg: membership.isPlatformOrg,
      })),
    )
  ) {
    redirect('/inscription');
  }

  const cookieStore = await cookies();
  const membership = pickOrganizationMembership(
    current,
    cookieStore.get(ORGANIZATION_COOKIE)?.value,
  );
  if (!membership || !isOrganizationWebRole(membership.role)) {
    redirect('/inscription');
  }

  return {
    authId: current.authUser.id,
    profile: {
      id: current.profile.id,
      businessId: membership.businessId,
      role: 'organization',
      userRole: membership.role,
      email: current.profile.email,
      fullName: current.profile.fullName,
    },
    ctx: createDataAccessContext({
      userId: current.profile.id,
      organizationId: membership.businessId,
      organizationRole: membership.role,
      memberships: current.memberships.map((item) => ({
        organizationId: item.businessId,
        role: item.role,
      })),
    }),
  };
}

export async function requireBusinessPermission(
  permission: BusinessPermission,
): Promise<BusinessPageContext> {
  const page = await requireBusinessPageContext();
  if (!hasBusinessPermission(page.profile.userRole, permission)) {
    redirect(WEB_ROUTES.businessDashboard);
  }
  return page;
}

export async function loadBusinessDashboard(businessId: string, ctx: DataAccessContext) {
  const { businesses, stats, businessOnboarding } = createRepositories();
  const [business, analytics, verification] = await Promise.all([
    businesses.findById(ctx, businessId),
    stats.getBusinessAnalytics(ctx, businessId),
    businessOnboarding.getLatestVerification(businessId),
  ]);

  if (!business) {
    return null;
  }

  return {
    business,
    analytics,
    verification,
  };
}

export async function loadVerificationPageData(businessId: string) {
  const { businessOnboarding, lockers } = createRepositories();
  const [summary, lockerList] = await Promise.all([
    businessOnboarding.getOnboardingSummary(businessId),
    lockers.listActivePickerOptions(),
  ]);

  return { summary, lockerList };
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

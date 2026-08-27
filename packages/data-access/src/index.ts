export type { User, CourierDossier, DriverDossier, OrganizationMembership } from './db/types.js';
export * from './context.js';
export * from './env.js';
export * from './db/index.js';
export * from './repositories/index.js';
export { createSupabaseAdminClient } from './supabase/server.js';
export * from './auth/index.js';

export { BusinessRepository } from './repositories/business.repository.js';
export {
  BusinessOnboardingRepository,
  type BusinessSettingsSnapshot,
  type BusinessBillingSnapshot,
} from './repositories/business-onboarding.repository.js';
export { DeliveryRepository, type CourierAdminDetail, type CourierHistorySummary } from './repositories/delivery.repository.js';
export { ParcelRepository } from './repositories/parcel.repository.js';
export { UserRepository } from './repositories/user.repository.js';
export { IssueRepository, type IssueWithRelations } from './repositories/issue.repository.js';
export { NotificationRepository, type CustomerNotification } from './repositories/notification.repository.js';
export {
  StatsRepository,
  type DashboardStats,
  type AnalyticsReport,
  type BusinessAnalytics,
  type PublicNetworkStats,
} from './repositories/stats.repository.js';
export { PricingRepository, toDeliveryPricingRules } from './repositories/pricing.repository.js';
export {
  LockerSettingsRepository,
  toLockerNetworkSettings,
} from './repositories/locker-settings.repository.js';
export {
  resolveBusinessPickupCoordinates,
  distanceKmToLocker,
  type PickupCoordinates,
} from './pricing/delivery-distance.js';
export { buildInviteLinks, getInviteConfig, buildParcelPickupLink, buildParcelTrackLink, buildTeamInviteLink } from './invitations/invite-links.js';
export { sendInvitation } from './invitations/invitation.service.js';
export {
  createGuestTrackToken,
  verifyGuestTrackToken,
  normalizeTrackPhone,
  phonesMatch,
} from './tracking/guest-track.js';
export {
  getWhatsAppConfig,
  normalizeWhatsAppPhone,
  sendWhatsAppTemplate,
  sendParcelStatusWhatsApp,
} from './messaging/index.js';
export {
  PaymentRepository,
  getPawaPayConfig,
  listPawaPayDepositProviders,
  DRC_DEPOSIT_PROVIDERS,
  type PickupPaymentSummary,
} from './payments/index.js';

import { db } from './db/index.js';
import { BusinessRepository } from './repositories/business.repository.js';
import { BusinessOnboardingRepository } from './repositories/business-onboarding.repository.js';
import { DeliveryRepository } from './repositories/delivery.repository.js';
import { LockerRepository } from './repositories/locker.repository.js';
import { ParcelRepository } from './repositories/parcel.repository.js';
import { IssueRepository } from './repositories/issue.repository.js';
import { NotificationRepository } from './repositories/notification.repository.js';
import { StatsRepository } from './repositories/stats.repository.js';
import { ParcelInviteRepository } from './repositories/parcel-invite.repository.js';
import { TeamInviteRepository } from './repositories/team-invite.repository.js';
import { OrganizationMembershipRepository } from './repositories/organization-membership.repository.js';
import { PaymentRepository } from './payments/payment.repository.js';
import { PricingRepository } from './repositories/pricing.repository.js';
import { LockerSettingsRepository } from './repositories/locker-settings.repository.js';
import { CourierDossierRepository } from './repositories/courier-dossier.repository.js';
import { OnboardingService } from './auth/onboarding.service.js';
import { AccountService } from './auth/account.service.js';
import { UserRepository } from './repositories/user.repository.js';

export function createRepositories() {
  const users = new UserRepository(db);
  const businesses = new BusinessRepository(db);
  const memberships = new OrganizationMembershipRepository(db);
  const businessOnboarding = new BusinessOnboardingRepository(db);
  const notifications = new NotificationRepository(db);
  const invites = new ParcelInviteRepository(db);
  const teamInvites = new TeamInviteRepository(db, users, memberships);
  const courierDossiers = new CourierDossierRepository(db);
  const payments = new PaymentRepository(db);
  const pricing = new PricingRepository(db);
  const lockerSettings = new LockerSettingsRepository(db);
  const deliveries = new DeliveryRepository(db, notifications);

  return {
    users,
    businesses,
    memberships,
    businessOnboarding,
    parcels: new ParcelRepository(db, notifications, invites, users),
    deliveries,
    lockers: new LockerRepository(db, notifications),
    lockerSettings,
    issues: new IssueRepository(db),
    notifications,
    invites,
    teamInvites,
    courierDossiers,
    payments,
    pricing,
    stats: new StatsRepository(db),
    onboarding: new OnboardingService(users, businesses, memberships, db),
    accounts: new AccountService(users, courierDossiers, deliveries, notifications, memberships),
  };
}

export type { User, CourierDossier, DriverDossier, OrganizationMembership, ParcelCharge } from './db/types.js';
export type { DriverRosterRecord } from './repositories/courier-dossier.repository.js';
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
  type LatestVerificationSnapshot,
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
  ParcelChargeRepository,
  quoteForPickupType,
} from './repositories/parcel-charge.repository.js';
export { syncParcelLockerRental } from './repositories/parcel-rental.js';
export {
  LockerSettingsRepository,
  toLockerNetworkSettings,
} from './repositories/locker-settings.repository.js';
export {
  PlatformSettingsRepository,
  PLATFORM_DEFAULT_FEATURES,
  type PlatformDefaultFeature,
  type PlatformSettingsRow,
} from './repositories/platform-settings.repository.js';
export {
  PlatformStaffRepository,
  type PlatformStaffMember,
  type PlatformAdminInviteDelivery,
  type PlatformAdminInvitePreview,
} from './repositories/platform-staff.repository.js';
export {
  resolveBusinessPickupCoordinates,
  distanceKmToLocker,
  type PickupCoordinates,
} from './pricing/delivery-distance.js';
export { buildInviteLinks, getInviteConfig, buildParcelPickupLink, buildParcelTrackLink, buildTeamInviteLink, buildPlatformAdminInviteLink } from './invitations/invite-links.js';
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
  getResendConfig,
  sendTeamInviteEmail,
} from './messaging/index.js';
export {
  hashOrganizationApiKey,
  generateOrganizationApiKey,
  generateNotificationSigningSecret,
  signNotificationBody,
  notificationSignatureHeader,
  apiKeyLooksValid,
} from './org-api/secrets.js';
export {
  isAllowedNotificationUrl,
  buildOrganizationNotificationPayload,
  deliverSignedNotification,
  notifyOrganizationOfParcelEvent,
} from './org-api/notify.js';

import { db } from './db/index.js';
import { BusinessRepository } from './repositories/business.repository.js';
import { BusinessOnboardingRepository } from './repositories/business-onboarding.repository.js';
import { DeliveryRepository } from './repositories/delivery.repository.js';
import { LockerRepository } from './repositories/locker.repository.js';
import { ServiceAreaRepository } from './repositories/service-area.repository.js';
import { ParcelRepository } from './repositories/parcel.repository.js';
import { ParcelEventRepository } from './repositories/parcel-event.repository.js';
import { OrganizationApiRepository } from './repositories/organization-api.repository.js';
import { IssueRepository } from './repositories/issue.repository.js';
import { NotificationRepository } from './repositories/notification.repository.js';
import { StatsRepository } from './repositories/stats.repository.js';
import { ParcelInviteRepository } from './repositories/parcel-invite.repository.js';
import { TeamInviteRepository } from './repositories/team-invite.repository.js';
import { OrganizationMembershipRepository } from './repositories/organization-membership.repository.js';
import { PaymentRepository } from './payments/payment.repository.js';
import { PricingRepository } from './repositories/pricing.repository.js';
import { ParcelChargeRepository } from './repositories/parcel-charge.repository.js';
import { LockerSettingsRepository } from './repositories/locker-settings.repository.js';
import { PlatformSettingsRepository } from './repositories/platform-settings.repository.js';
import { PlatformStaffRepository } from './repositories/platform-staff.repository.js';
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
  const parcelCharges = new ParcelChargeRepository(db);
  const lockerSettings = new LockerSettingsRepository(db);
  const platformSettings = new PlatformSettingsRepository(db);
  const platformStaff = new PlatformStaffRepository(db, users);
  const deliveries = new DeliveryRepository(db, notifications);
  const parcelEvents = new ParcelEventRepository(db);
  const organizationApi = new OrganizationApiRepository(db);
  const serviceAreas = new ServiceAreaRepository(db);

  return {
    users,
    businesses,
    memberships,
    businessOnboarding,
    parcels: new ParcelRepository(db, notifications, invites, users),
    parcelEvents,
    organizationApi,
    deliveries,
    lockers: new LockerRepository(db, notifications),
    serviceAreas,
    lockerSettings,
    platformSettings,
    platformStaff,
    issues: new IssueRepository(db),
    notifications,
    invites,
    teamInvites,
    courierDossiers,
    payments,
    pricing,
    parcelCharges,
    stats: new StatsRepository(db),
    onboarding: new OnboardingService(users, businesses, memberships, db),
    accounts: new AccountService(users, courierDossiers, deliveries, notifications, memberships),
  };
}

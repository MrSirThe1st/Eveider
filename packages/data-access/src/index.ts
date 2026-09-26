export type { User, CourierDossier, DriverDossier, DriverVehicleDocument, OrganizationMembership, ParcelCharge } from './db/types.js';
export type { DriverRosterRecord } from './repositories/courier-dossier.repository.js';
export * from './context.js';
export * from './env.js';
export * from './db/index.js';
export * from './repositories/index.js';
export { createSupabaseAdminClient } from './supabase/server.js';
export {
  ALLOWED_IDENTITY_DOCUMENT_MIME_TYPES,
  MAX_IDENTITY_DOCUMENT_BYTES,
  downloadIdentityDocument,
  removeStoredDocument,
  uploadIdentityDocument,
  validateIdentityDocumentFile,
} from './storage/identity-documents.js';
export * from './auth/index.js';

export { BusinessRepository } from './repositories/business.repository.js';
export {
  BusinessOnboardingRepository,
  type BusinessSettingsSnapshot,
  type BusinessBillingSnapshot,
  type LatestVerificationSnapshot,
} from './repositories/business-onboarding.repository.js';
export { DeliveryRepository, type ClaimableParcel, type CourierAdminDetail, type CourierHistorySummary, type ParcelDeliverySummary } from './repositories/delivery.repository.js';
export { ParcelRepository } from './repositories/parcel.repository.js';
export { ParcelReturnRepository } from './repositories/parcel-return.repository.js';
export { UserRepository, type AssignableDriver } from './repositories/user.repository.js';
export { IssueRepository, type IssueWithRelations } from './repositories/issue.repository.js';
export { NotificationRepository, type CustomerNotification } from './repositories/notification.repository.js';
export {
  NotificationService,
  ExpoPushProvider,
  EMAIL_ELIGIBLE_NOTIFICATION_TYPES,
  HIGH_PRIORITY_MOBILE_TYPES,
  isValidExpoPushToken,
  type AdminOperationalBadges,
  type BusinessOperationalBadges,
  type EmitUserNotificationInput,
  type EmitWebNotificationInput,
  type MobileNotificationType,
  type NotificationType,
  type PushDevicePlatform,
  type UserPushDevice,
  type WebInboxItem,
  type WebNotificationType,
} from './notifications/index.js';
export {
  StatsRepository,
  type DashboardStats,
  type AnalyticsReport,
  type BusinessAnalytics,
  type BusinessOperationalSnapshot,
  type PublicNetworkStats,
} from './repositories/stats.repository.js';
export { PricingRepository, toDeliveryPricingRules } from './repositories/pricing.repository.js';
export { CityRepository } from './repositories/city.repository.js';
export { CommercialRepository } from './repositories/commercial.repository.js';
export {
  ParcelChargeRepository,
  quoteForPickupType,
  type BusinessBillingHistoryRow,
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
  readPlatformCurrency,
} from './repositories/platform-settings.repository.js';
export {
  PlatformStaffRepository,
  type PlatformStaffMember,
  type FormerPlatformStaffMember,
  type PlatformAdminInviteDelivery,
  type PlatformAdminInvitePreview,
} from './repositories/platform-staff.repository.js';
export {
  resolveBusinessPickupCoordinates,
  distanceKmToLocker,
  type PickupCoordinates,
} from './pricing/delivery-distance.js';
export { buildInviteLinks, getInviteConfig, buildParcelPickupLink, buildParcelTrackLink, buildTeamInviteLink, buildPlatformAdminInviteLink, buildDriverInviteLink } from './invitations/invite-links.js';
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
  parseLockerApiTokens,
  resolveLockerIdForApiToken,
  lockerMaintenanceTokenMatches,
  lockerMaintenanceTokenConfigured,
  LOCKER_API_TOKEN_ENV,
  LOCKER_MAINTENANCE_TOKEN_ENV,
} from './locker-api/auth.js';
export { hashLockerCollectionPin, lockerPinHashMatches } from './locker-api/pin-hash.js';
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
import { LockerActionRepository } from './repositories/locker-action.repository.js';
import { CollectionCredentialRepository } from './repositories/collection-credential.repository.js';
import { ServiceAreaRepository } from './repositories/service-area.repository.js';
import { CityRepository } from './repositories/city.repository.js';
import { ParcelRepository } from './repositories/parcel.repository.js';
import { ParcelReturnRepository } from './repositories/parcel-return.repository.js';
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
import { CommercialRepository } from './repositories/commercial.repository.js';
import { ParcelChargeRepository } from './repositories/parcel-charge.repository.js';
import { LockerSettingsRepository } from './repositories/locker-settings.repository.js';
import { PlatformSettingsRepository } from './repositories/platform-settings.repository.js';
import { PlatformStaffRepository } from './repositories/platform-staff.repository.js';
import { DriverInviteRepository } from './repositories/driver-invite.repository.js';
import { CourierDossierRepository } from './repositories/courier-dossier.repository.js';
import { OnboardingService } from './auth/onboarding.service.js';
import { AccountService } from './auth/account.service.js';
import { UserRepository } from './repositories/user.repository.js';

export function createRepositories() {
  const users = new UserRepository(db);
  const businesses = new BusinessRepository(db);
  const memberships = new OrganizationMembershipRepository(db);
  const notifications = new NotificationRepository(db);
  const businessOnboarding = new BusinessOnboardingRepository(db, notifications);
  const invites = new ParcelInviteRepository(db);
  const teamInvites = new TeamInviteRepository(db, users, memberships);
  const courierDossiers = new CourierDossierRepository(db, notifications);
  const driverInvites = new DriverInviteRepository(db);
  const payments = new PaymentRepository(db);
  const pricing = new PricingRepository(db);
  const parcelCharges = new ParcelChargeRepository(db);
  const commercial = new CommercialRepository(db);
  const lockerSettings = new LockerSettingsRepository(db);
  const platformSettings = new PlatformSettingsRepository(db);
  const platformStaff = new PlatformStaffRepository(db, users);
  const deliveries = new DeliveryRepository(db, notifications);
  const parcelEvents = new ParcelEventRepository(db);
  const parcelReturns = new ParcelReturnRepository(db, notifications);
  const organizationApi = new OrganizationApiRepository(db);
  const serviceAreas = new ServiceAreaRepository(db);
  const cities = new CityRepository(db);

  return {
    users,
    businesses,
    memberships,
    businessOnboarding,
    parcels: new ParcelRepository(db, notifications, invites, users),
    parcelEvents,
    parcelReturns,
    organizationApi,
    deliveries,
    lockers: new LockerRepository(db, notifications),
    lockerActions: new LockerActionRepository(db),
    collectionCredentials: new CollectionCredentialRepository(db),
    serviceAreas,
    cities,
    lockerSettings,
    platformSettings,
    platformStaff,
    issues: new IssueRepository(db, notifications),
    notifications,
    invites,
    teamInvites,
    driverInvites,
    courierDossiers,
    payments,
    pricing,
    parcelCharges,
    commercial,
    stats: new StatsRepository(db),
    onboarding: new OnboardingService(users, businesses, memberships, db),
    accounts: new AccountService(
      users,
      courierDossiers,
      deliveries,
      notifications,
      memberships,
      businesses,
      driverInvites,
    ),
  };
}

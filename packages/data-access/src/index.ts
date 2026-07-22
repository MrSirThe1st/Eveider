export type { User } from './db/types.js';
export * from './context.js';
export * from './env.js';
export * from './db/index.js';
export * from './repositories/index.js';
export { createSupabaseAdminClient } from './supabase/server.js';
export * from './auth/index.js';

export { BusinessRepository } from './repositories/business.repository.js';
export { BusinessOnboardingRepository } from './repositories/business-onboarding.repository.js';
export { DeliveryRepository, type CourierAdminDetail } from './repositories/delivery.repository.js';
export { ParcelRepository } from './repositories/parcel.repository.js';
export { UserRepository } from './repositories/user.repository.js';
export { IssueRepository, type IssueWithRelations } from './repositories/issue.repository.js';
export { NotificationRepository, type CustomerNotification } from './repositories/notification.repository.js';
export { StatsRepository, type DashboardStats, type AnalyticsReport } from './repositories/stats.repository.js';
export { ParcelInviteRepository } from './repositories/parcel-invite.repository.js';
export { buildInviteLinks, getInviteConfig, buildParcelPickupLink, buildParcelTrackLink } from './invitations/invite-links.js';
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
import { PaymentRepository } from './payments/payment.repository.js';
import { OnboardingService } from './auth/onboarding.service.js';
import { UserRepository } from './repositories/user.repository.js';

export function createRepositories() {
  const users = new UserRepository(db);
  const businesses = new BusinessRepository(db);
  const businessOnboarding = new BusinessOnboardingRepository(db);
  const notifications = new NotificationRepository(db);
  const invites = new ParcelInviteRepository(db);
  const payments = new PaymentRepository(db);

  return {
    users,
    businesses,
    businessOnboarding,
    parcels: new ParcelRepository(db, notifications, invites, users),
    deliveries: new DeliveryRepository(db, notifications),
    lockers: new LockerRepository(db),
    issues: new IssueRepository(db),
    notifications,
    invites,
    payments,
    stats: new StatsRepository(db),
    onboarding: new OnboardingService(users, businesses, db),
  };
}

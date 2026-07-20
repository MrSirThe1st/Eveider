export { prisma } from './client.js';
export * from './context.js';
export * from './env.js';
export * from './repositories/index.js';
export { createSupabaseAdminClient } from './supabase/server.js';
export * from './auth/index.js';

export { BusinessRepository } from './repositories/business.repository.js';
export { DeliveryRepository } from './repositories/delivery.repository.js';
export { ParcelRepository } from './repositories/parcel.repository.js';
export { UserRepository } from './repositories/user.repository.js';
export { IssueRepository, type IssueWithRelations } from './repositories/issue.repository.js';
export { NotificationRepository, type CustomerNotification } from './repositories/notification.repository.js';
export { StatsRepository, type DashboardStats, type AnalyticsReport } from './repositories/stats.repository.js';
export { ParcelInviteRepository } from './repositories/parcel-invite.repository.js';
export { buildInviteLinks, getInviteConfig } from './invitations/invite-links.js';
export { sendInvitation } from './invitations/invitation.service.js';
export {
  getWhatsAppConfig,
  normalizeWhatsAppPhone,
  sendWhatsAppTemplate,
  sendParcelStatusWhatsApp,
} from './messaging/index.js';

import { prisma } from './client.js';
import { BusinessRepository } from './repositories/business.repository.js';
import { DeliveryRepository } from './repositories/delivery.repository.js';
import { LockerRepository } from './repositories/locker.repository.js';
import { ParcelRepository } from './repositories/parcel.repository.js';
import { IssueRepository } from './repositories/issue.repository.js';
import { NotificationRepository } from './repositories/notification.repository.js';
import { StatsRepository } from './repositories/stats.repository.js';
import { ParcelInviteRepository } from './repositories/parcel-invite.repository.js';
import { OnboardingService } from './auth/onboarding.service.js';
import { UserRepository } from './repositories/user.repository.js';

export function createRepositories() {
  const users = new UserRepository(prisma);
  const businesses = new BusinessRepository(prisma);
  const notifications = new NotificationRepository(prisma);
  const invites = new ParcelInviteRepository(prisma);

  return {
    users,
    businesses,
    parcels: new ParcelRepository(prisma, notifications, invites, users),
    deliveries: new DeliveryRepository(prisma, notifications),
    lockers: new LockerRepository(prisma),
    issues: new IssueRepository(prisma),
    notifications,
    invites,
    stats: new StatsRepository(prisma),
    onboarding: new OnboardingService(users, businesses, prisma),
  };
}

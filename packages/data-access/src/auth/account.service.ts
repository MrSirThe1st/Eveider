import { createSupabaseAdminClient } from '../supabase/server.js';
import type { DataAccessContext } from '../context.js';
import { AccessDeniedError } from '../context.js';
import type { User } from '../db/types.js';
import { CourierDossierRepository } from '../repositories/courier-dossier.repository.js';
import { DeliveryRepository } from '../repositories/delivery.repository.js';
import { NotificationRepository } from '../repositories/notification.repository.js';
import { OrganizationMembershipRepository } from '../repositories/organization-membership.repository.js';
import { UserRepository } from '../repositories/user.repository.js';

const AUTH_BAN_DURATION = '876000h';
const DRIVER_INVITE_REDIRECT = 'eveider://auth';

export class AccountService {
  constructor(
    private readonly users: UserRepository,
    private readonly dossiers: CourierDossierRepository,
    private readonly deliveries: DeliveryRepository,
    private readonly notifications: NotificationRepository,
    private readonly memberships: OrganizationMembershipRepository,
  ) {}

  async deleteCustomer(user: User): Promise<void> {
    if (!user.isCustomer) {
      throw new AccessDeniedError('Seuls les clients peuvent supprimer leur compte');
    }
    if (user.deletedAt) {
      throw new AccessDeniedError('Compte déjà supprimé');
    }

    await this.users.updateProfile(user.id, {
      fullName: 'Compte supprimé',
      deletedAt: new Date(),
    });

    const admin = createSupabaseAdminClient();
    await admin.auth.admin.updateUserById(user.authId, { ban_duration: AUTH_BAN_DURATION });
  }

  async deactivateCourier(user: User): Promise<void> {
    const driverMemberships = (await this.memberships.listByUserId(user.id)).filter(
      (membership) => membership.role === 'driver',
    );
    if (driverMemberships.length === 0) {
      throw new AccessDeniedError('Seuls les chauffeurs peuvent désactiver leur compte');
    }
    if (user.deactivatedAt) {
      throw new AccessDeniedError('Compte déjà désactivé');
    }

    const inProgress = await this.deliveries.hasActiveForCourier(user.id);
    if (inProgress) {
      throw new Error(
        'Impossible de désactiver le compte tant qu’une livraison est en cours',
      );
    }

    const dossier = await this.dossiers.deactivate(user.id);
    await this.users.updateProfile(user.id, { deactivatedAt: new Date() });
    await this.notifyContractor(dossier.contractorType, dossier.businessId, user.fullName);
  }

  async reactivateCourier(ctx: DataAccessContext, dossierId: string): Promise<void> {
    const dossier = await this.dossiers.reactivate(ctx, dossierId);
    if (dossier.userId) {
      await this.users.updateProfile(dossier.userId, { deactivatedAt: null });
    }
  }

  async activateOnLogin(user: User): Promise<void> {
    await this.dossiers.markActive(user.id);
  }

  async inviteApprovedDossier(ctx: DataAccessContext, dossierId: string) {
    const dossier = await this.dossiers.requireInScope(ctx, dossierId);
    if (dossier.status !== 'approved') {
      throw new Error('Le dossier doit être approuvé avant invitation');
    }

    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: dossier.email,
      options: { redirectTo: DRIVER_INVITE_REDIRECT },
    });
    if (error) {
      throw new Error(error.message);
    }

    const authId = data.user?.id;
    if (!authId) {
      throw new Error('Invitation Auth impossible');
    }

    let user = await this.users.findByAuthId(authId);
    if (!user) {
      user = await this.users.createProfile({
        authId,
        email: dossier.email,
        phone: dossier.phone ?? undefined,
        fullName: dossier.fullName,
      });
    }

    if (dossier.businessId) {
      await this.memberships.upsert({
        userId: user.id,
        businessId: dossier.businessId,
        role: 'driver',
      });
    }

    const invited = await this.dossiers.markInvited(dossier.id, user.id);
    console.info('[eveider:driver-invite:simulated]', {
      email: dossier.email,
      redirectTo: DRIVER_INVITE_REDIRECT,
      dossierId: dossier.id,
    });
    return invited;
  }

  private async notifyContractor(
    contractorType: 'eveider' | 'business',
    businessId: string | null,
    courierName: string | null,
  ): Promise<void> {
    const recipients =
      contractorType === 'business' && businessId
        ? await this.users.listByBusiness(businessId)
        : await this.users.listPlatformStaff();

    await this.notifications.notifyCourierDeactivated(
      recipients.map((member) => member.id),
      courierName ?? 'un chauffeur',
    );
  }
}

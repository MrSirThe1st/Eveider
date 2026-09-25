import { canInviteDriverDossier } from '@eveider/domain';
import type { DataAccessContext } from '../context.js';
import { AccessDeniedError } from '../context.js';
import type { CourierDossier, User } from '../db/types.js';
import { BusinessRepository } from '../repositories/business.repository.js';
import { CourierDossierRepository } from '../repositories/courier-dossier.repository.js';
import { DeliveryRepository } from '../repositories/delivery.repository.js';
import {
  DriverInviteRepository,
  type DriverInviteDelivery,
} from '../repositories/driver-invite.repository.js';
import { NotificationRepository } from '../repositories/notification.repository.js';
import { OrganizationMembershipRepository } from '../repositories/organization-membership.repository.js';
import { UserRepository } from '../repositories/user.repository.js';
import { createSupabaseAdminClient } from '../supabase/server.js';

const AUTH_BAN_DURATION = '876000h';

export type DriverInviteResult = DriverInviteDelivery & {
  dossier: CourierDossier;
};

export class AccountService {
  constructor(
    private readonly users: UserRepository,
    private readonly dossiers: CourierDossierRepository,
    private readonly deliveries: DeliveryRepository,
    private readonly notifications: NotificationRepository,
    private readonly memberships: OrganizationMembershipRepository,
    private readonly businesses: BusinessRepository,
    private readonly driverInvites: DriverInviteRepository,
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

  /**
   * Admin disciplinary pause — blocks login and new assignments (`users.is_blocked`).
   * Distinct from self-service deactivate (`deactivated_at`).
   */
  async setCourierPaused(
    ctx: DataAccessContext,
    dossierId: string,
    paused: boolean,
  ): Promise<User> {
    const dossier = await this.dossiers.requireInScope(ctx, dossierId);
    if (!dossier.userId) {
      throw new Error('Aucun compte utilisateur lié à ce dossier');
    }
    const user = await this.users.findById(dossier.userId);
    if (!user) {
      throw new Error('Compte chauffeur introuvable');
    }
    if (user.deletedAt) {
      throw new AccessDeniedError('Compte déjà supprimé');
    }
    return this.users.updateProfile(user.id, { isBlocked: paused });
  }

  /**
   * Admin hard removal — soft-deletes the user, bans Auth, and marks the dossier deleted.
   */
  async deleteCourier(ctx: DataAccessContext, dossierId: string): Promise<void> {
    const dossier = await this.dossiers.requireInScope(ctx, dossierId);
    if (dossier.status === 'deleted') {
      throw new AccessDeniedError('Dossier déjà supprimé');
    }

    if (dossier.userId) {
      const user = await this.users.findById(dossier.userId);
      if (!user) {
        throw new Error('Compte chauffeur introuvable');
      }
      if (user.deletedAt) {
        throw new AccessDeniedError('Compte déjà supprimé');
      }

      const inProgress = await this.deliveries.hasActiveForCourier(user.id);
      if (inProgress) {
        throw new Error(
          'Impossible de supprimer le compte tant qu’une livraison est en cours',
        );
      }

      await this.users.updateProfile(user.id, {
        fullName: 'Compte supprimé',
        deletedAt: new Date(),
        isBlocked: true,
      });

      const admin = createSupabaseAdminClient();
      await admin.auth.admin.updateUserById(user.authId, { ban_duration: AUTH_BAN_DURATION });
    }

    await this.dossiers.markDeleted(ctx, dossierId);
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

  async activateOnLogin(user: User): Promise<CourierDossier | null> {
    return this.dossiers.markActive(user.id);
  }

  async inviteApprovedDossier(ctx: DataAccessContext, dossierId: string) {
    return this.inviteDossier(ctx, dossierId);
  }

  async inviteDossier(ctx: DataAccessContext, dossierId: string) {
    const dossier = await this.dossiers.requireInScope(ctx, dossierId);
    if (!canInviteDriverDossier(dossier.status, dossier.contractorType)) {
      throw new Error(
        dossier.contractorType === 'business'
          ? 'Ce chauffeur doit d’abord être approuvé par Eveider'
          : 'Ce chauffeur ne peut pas être invité',
      );
    }
    return this.completeInvite(ctx, dossier);
  }

  /**
   * After the chauffeur creates a password account (or logs in) with a valid invite token,
   * link dossier + membership and promote Invité → Actif.
   */
  async acceptDriverInvite(input: {
    token: string;
    authId: string;
    email: string;
    fullName?: string;
    phone?: string;
  }): Promise<{
    fullName: string | null;
    status: CourierDossier['status'];
  }> {
    const preview = await this.driverInvites.getPreview(input.token);
    if (!preview) {
      throw new Error('Invitation introuvable');
    }
    if (input.email.trim().toLowerCase() !== preview.email.trim().toLowerCase()) {
      throw new Error('Cette invitation est destinée à une autre adresse email');
    }

    let user = await this.users.findByAuthId(input.authId);
    if (!user) {
      user = await this.users.createProfile({
        authId: input.authId,
        email: input.email,
        phone: input.phone,
        fullName: input.fullName?.trim() || preview.fullName || undefined,
      });
    }

    if (user.isBlocked || user.deactivatedAt || user.deletedAt) {
      throw new AccessDeniedError('Compte chauffeur indisponible');
    }

    const invite = await this.driverInvites.acceptForUser({
      token: input.token,
      email: input.email,
      userId: user.id,
    });

    const dossier = await this.dossiers.requireById(invite.dossierId);
    await this.ensureDriverMembership(dossier, user.id);
    const linked = await this.dossiers.attachInvite(dossier, user.id);
    const active = await this.dossiers.markActive(user.id);
    const next = active ?? linked;

    return {
      fullName: user.fullName ?? next.fullName,
      status: next.status,
    };
  }

  /** @deprecated Magic-link activation — kept only so old emailed hashes show a clear error. */
  async completeDriverMagicLink(authId: string): Promise<{
    fullName: string | null;
    status: CourierDossier['status'];
  }> {
    const user = await this.users.findByAuthId(authId);
    if (!user) {
      throw new Error('Profil chauffeur introuvable');
    }
    if (user.isBlocked || user.deactivatedAt || user.deletedAt) {
      throw new AccessDeniedError('Compte chauffeur indisponible');
    }

    const dossier = await this.dossiers.findByUserId(user.id);
    if (!dossier) {
      throw new Error('Aucun dossier chauffeur pour ce compte');
    }

    await this.ensureDriverMembership(dossier, user.id);
    const active = await this.dossiers.markActive(user.id);
    const next = active ?? dossier;
    return {
      fullName: user.fullName ?? next.fullName,
      status: next.status,
    };
  }

  private async completeInvite(
    ctx: DataAccessContext,
    dossier: CourierDossier,
  ): Promise<DriverInviteResult> {
    if (dossier.contractorType === 'eveider' && dossier.status === 'pending_review') {
      dossier = await this.dossiers.review(ctx, dossier.id, { status: 'approved' });
    }

    const issued = await this.dossiers.markInviteIssued(dossier);
    const delivery = await this.driverInvites.createForDossier(ctx, {
      dossierId: issued.id,
      email: issued.email,
      fullName: issued.fullName,
    });

    return { dossier: issued, ...delivery };
  }

  private async ensureDriverMembership(dossier: CourierDossier, userId: string): Promise<void> {
    let organizationId = dossier.businessId;
    if (!organizationId) {
      const platform = await this.businesses.findPlatformOrganization();
      organizationId = platform?.id ?? null;
    }
    if (!organizationId) {
      throw new Error('Organisation Eveider introuvable');
    }
    await this.memberships.upsert({
      userId,
      businessId: organizationId,
      role: 'driver',
    });
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

import { canInviteDriverDossier } from '@eveider/domain';
import type { DataAccessContext } from '../context.js';
import { AccessDeniedError } from '../context.js';
import type { CourierDossier, User } from '../db/types.js';
import {
  buildDriverAppInviteLink,
  buildDriverInviteLink,
  getInviteConfig,
} from '../invitations/invite-links.js';
import { sendDriverInviteEmail } from '../messaging/driver-invite-email.js';
import { getResendConfig } from '../messaging/resend-config.js';
import { BusinessRepository } from '../repositories/business.repository.js';
import { CourierDossierRepository } from '../repositories/courier-dossier.repository.js';
import { DeliveryRepository } from '../repositories/delivery.repository.js';
import { NotificationRepository } from '../repositories/notification.repository.js';
import { OrganizationMembershipRepository } from '../repositories/organization-membership.repository.js';
import { UserRepository } from '../repositories/user.repository.js';
import { createSupabaseAdminClient } from '../supabase/server.js';

const AUTH_BAN_DURATION = '876000h';

export type DriverInviteResult = {
  dossier: CourierDossier;
  inviteUrl: string;
  delivered: 'email' | 'simulated';
};

export class AccountService {
  constructor(
    private readonly users: UserRepository,
    private readonly dossiers: CourierDossierRepository,
    private readonly deliveries: DeliveryRepository,
    private readonly notifications: NotificationRepository,
    private readonly memberships: OrganizationMembershipRepository,
    private readonly businesses: BusinessRepository,
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
   * After the chauffeur opens the magic link, promote Invité → Actif
   * and make sure they have a driver membership.
   */
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

    const admin = createSupabaseAdminClient();
    const { webBaseUrl } = getInviteConfig();
    const redirectTo = `${webBaseUrl}/invite/chauffeur`;

    let link = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: dossier.email,
      options: { redirectTo },
    });
    if (link.error) {
      const created = await admin.auth.admin.createUser({
        email: dossier.email,
        email_confirm: true,
        user_metadata: { full_name: dossier.fullName, kind: 'driver' },
      });
      if (created.error && !/already|registered|exists|déjà/i.test(created.error.message)) {
        throw new Error(created.error.message);
      }
      link = await admin.auth.admin.generateLink({
        type: 'magiclink',
        email: dossier.email,
        options: { redirectTo },
      });
    }
    if (link.error) {
      throw new Error(link.error.message);
    }

    const authId = link.data.user?.id;
    const tokenHash = link.data.properties?.hashed_token;
    if (!authId || !tokenHash) {
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

    await this.ensureDriverMembership(dossier, user.id);
    const invited = await this.dossiers.attachInvite(dossier, user.id);
    const inviteUrl = buildDriverInviteLink(tokenHash);
    const appUrl = buildDriverAppInviteLink(tokenHash);

    let delivered: DriverInviteResult['delivered'] = 'email';
    try {
      await sendDriverInviteEmail({
        to: dossier.email,
        fullName: dossier.fullName,
        inviteUrl,
        appUrl,
      });
    } catch (error) {
      if (!getResendConfig()) {
        console.info('[eveider:driver-invite:simulated]', {
          email: dossier.email,
          inviteUrl,
          appUrl,
          dossierId: dossier.id,
        });
        delivered = 'simulated';
      } else {
        throw error;
      }
    }

    return { dossier: invited, inviteUrl, delivered };
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

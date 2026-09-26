import { ACTIVE_DELIVERY_STATUSES, type ParcelStatus } from '@eveider/domain';
import {
  AccessDeniedError,
  assertCourierRole,
  assertCustomerRole,
  type DataAccessContext,
} from '../context.js';
import type { Queryable } from '../db/index.js';
import { mapNotification, mapParcel } from '../db/mappers.js';
import type { Notification, Parcel } from '../db/types.js';
import { sendParcelStatusWhatsApp } from '../messaging/parcel-whatsapp.js';
import { NotificationService } from '../notifications/notification.service.js';
import type { MobileNotificationType } from '../notifications/types.js';

export type CustomerNotification = Notification & {
  parcel: { id: string; trackingNumber: string; reference: string | null } | null;
};

const CUSTOMER_STATUS_COPY: Partial<
  Record<
    ParcelStatus,
    { type: MobileNotificationType; title: string; body: (tracking: string, locker?: string | null) => string }
  >
> = {
  in_transit: {
    type: 'parcel.in_transit',
    title: 'Votre colis est en route',
    body: (tracking, locker) =>
      locker
        ? `Votre colis ${tracking} est en route vers ${locker}.`
        : `Votre colis ${tracking} est en route.`,
  },
  ready_for_pickup: {
    type: 'parcel.ready_for_pickup',
    title: 'Votre colis est disponible',
    body: (tracking, locker) =>
      locker
        ? `Votre colis ${tracking} est prêt au retrait à ${locker}.`
        : `Votre colis ${tracking} est prêt au retrait.`,
  },
  collected: {
    type: 'parcel.collected',
    title: 'Colis retiré',
    body: (tracking) => `Votre colis ${tracking} a été retiré.`,
  },
};

export class NotificationRepository {
  /** Typed inbox + targeting (web + mobile) + Expo push. */
  readonly web: NotificationService;

  constructor(private readonly db: Queryable) {
    this.web = new NotificationService(db);
  }

  async notifyParcelCreatedForCustomer(
    parcelId: string,
    userId: string,
    businessName: string,
  ): Promise<void> {
    try {
      await this.web.emitToUser({
        userId,
        type: 'parcel.created_for_recipient',
        title: 'Nouveau colis',
        message: `${businessName} vous a envoyé un colis avec Eveider.`,
        entityType: 'parcel',
        entityId: parcelId,
        parcelId,
        dedupeKey: `parcel.created_for_recipient:${parcelId}`,
      });
    } catch (error) {
      console.error('[eveider:notify] parcel.created_for_recipient failed', { parcelId, error });
    }
  }

  async notifyParcelStatusChange(parcelId: string, newStatus: ParcelStatus): Promise<void> {
    const copy = CUSTOMER_STATUS_COPY[newStatus];
    if (!copy) return;

    const result = await this.db.query(
      `SELECT p.*, l.name AS locker_name FROM parcels p LEFT JOIN lockers l ON l.id = p.locker_id WHERE p.id = $1 LIMIT 1`,
      [parcelId],
    );
    const row = result.rows[0];
    if (!row) return;
    const parcel = mapParcel(row);
    const lockerName = row.locker_name == null ? null : String(row.locker_name);

    const userId = await this.resolveCustomerUserId(parcel);
    if (userId) {
      try {
        await this.web.emitToUser({
          userId,
          type: copy.type,
          title: copy.title,
          message: copy.body(parcel.trackingNumber, lockerName),
          entityType: 'parcel',
          entityId: parcelId,
          parcelId,
          businessId: parcel.businessId,
          dedupeKey: `${copy.type}:${parcelId}`,
        });
      } catch (error) {
        console.error('[eveider:notify] parcel status notify failed', {
          parcelId,
          newStatus,
          error,
        });
      }
    }

    // Phone-first WhatsApp — works even if the recipient has no app account yet.
    try {
      await sendParcelStatusWhatsApp(this.db, parcelId, newStatus);
    } catch (error) {
      console.error('[eveider:whatsapp] unexpected error', { parcelId, newStatus, error });
    }
  }

  async notifyCourierAssigned(input: {
    courierId: string;
    deliveryId: string;
    parcelId: string;
    trackingNumber: string;
    businessName?: string | null;
    lockerName?: string | null;
    kind: 'outbound' | 'customer_return';
  }): Promise<void> {
    const isReturn = input.kind === 'customer_return';
    const locker = input.lockerName?.trim();
    const business = input.businessName?.trim();

    const title = isReturn ? 'Nouveau retour' : 'Nouvelle collecte';
    const lockerLabel = locker
      ? /^eveider\b/i.test(locker) || /^casier\b/i.test(locker)
        ? locker.replace(/^Casier\s+/i, '')
        : `Eveider ${locker}`
      : null;
    const message = isReturn
      ? lockerLabel
        ? `À récupérer\n${lockerLabel}`
        : `Un retour vous a été assigné\n${input.trackingNumber}`
      : business && lockerLabel
        ? `${business} → ${lockerLabel}\n1 colis à récupérer`
        : business
          ? `${business}\n1 colis à récupérer`
          : lockerLabel
            ? `${lockerLabel}\n${input.trackingNumber}`
            : `1 colis à récupérer\n${input.trackingNumber}`;

    try {
      await this.web.emitToUser({
        userId: input.courierId,
        type: isReturn ? 'return.assigned' : 'delivery.assigned',
        title,
        message,
        entityType: 'delivery',
        entityId: input.deliveryId,
        parcelId: input.parcelId,
        dedupeKey: `${isReturn ? 'return.assigned' : 'delivery.assigned'}:${input.deliveryId}`,
      });
    } catch (error) {
      console.error('[eveider:notify] courier assignment failed', {
        deliveryId: input.deliveryId,
        error,
      });
    }
  }

  async notifyCustomerReturnAuthorized(input: {
    userId: string;
    parcelId: string;
    returnId: string;
    businessId: string;
  }): Promise<void> {
    try {
      await this.web.emitToUser({
        userId: input.userId,
        type: 'return.authorized',
        title: 'Retour autorisé',
        message: 'Vous pouvez déposer votre retour au point Eveider sélectionné.',
        entityType: 'parcel_return',
        entityId: input.returnId,
        parcelId: input.parcelId,
        businessId: input.businessId,
        dedupeKey: `return.authorized:${input.returnId}`,
      });
    } catch (error) {
      console.error('[eveider:notify] return.authorized failed', { returnId: input.returnId, error });
    }
  }

  async notifyCustomerReturnDeposited(input: {
    userId: string;
    parcelId: string;
    returnId: string;
    businessId: string;
  }): Promise<void> {
    try {
      await this.web.emitToUser({
        userId: input.userId,
        type: 'return.deposited',
        title: 'Retour déposé',
        message: 'Votre retour a bien été déposé.',
        entityType: 'parcel_return',
        entityId: input.returnId,
        parcelId: input.parcelId,
        businessId: input.businessId,
        dedupeKey: `return.deposited:${input.returnId}`,
      });
    } catch (error) {
      console.error('[eveider:notify] return.deposited failed', { returnId: input.returnId, error });
    }
  }

  async notifyCustomerReturnCompleted(input: {
    userId: string;
    parcelId: string;
    returnId: string;
    businessId: string;
  }): Promise<void> {
    try {
      await this.web.emitToUser({
        userId: input.userId,
        type: 'return.completed',
        title: 'Retour terminé',
        message: 'Votre retour a été remis à l’entreprise.',
        entityType: 'parcel_return',
        entityId: input.returnId,
        parcelId: input.parcelId,
        businessId: input.businessId,
        dedupeKey: `return.completed.customer:${input.returnId}`,
      });
    } catch (error) {
      console.error('[eveider:notify] return.completed (customer) failed', {
        returnId: input.returnId,
        error,
      });
    }
  }

  async notifyCouriersLockerBlocked(lockerId: string, lockerName: string): Promise<void> {
    const result = await this.db.query(
      `SELECT DISTINCT d.driver_id
       FROM deliveries d
       JOIN parcels p ON p.id = d.parcel_id
       WHERE p.locker_id = $1 AND d.status = ANY($2)`,
      [lockerId, ACTIVE_DELIVERY_STATUSES],
    );
    const message = `Casier indisponible\n${lockerName} · dépôt bloqué`;
    for (const row of result.rows) {
      const courierId = String(row.driver_id);
      try {
        await this.web.emitToUser({
          userId: courierId,
          type: 'locker.blocked',
          title: 'Casier indisponible',
          message,
          entityType: 'locker',
          entityId: lockerId,
          dedupeKey: `locker.blocked:${lockerId}:${courierId}`,
          sendPush: false,
        });
      } catch (error) {
        console.error('[eveider:notify] locker.blocked failed', { lockerId, courierId, error });
      }
    }
  }

  async listForCustomer(ctx: DataAccessContext): Promise<CustomerNotification[]> {
    this.assertInboxRole(ctx);

    const result = await this.db.query(
      `SELECT n.*, p.id AS parcel_id_relation, p.tracking_number AS parcel_tracking_number,
              p.reference AS parcel_reference
       FROM notifications n
       LEFT JOIN parcels p ON p.id = n.parcel_id
       WHERE n.user_id = $1 AND n.channel = 'in_app'
       ORDER BY n.created_at DESC`,
      [ctx.userId!],
    );
    return result.rows.map((row) => ({
      ...mapNotification(row),
      parcel: row.parcel_id_relation
        ? {
            id: String(row.parcel_id_relation),
            trackingNumber: String(row.parcel_tracking_number),
            reference:
              row.parcel_reference == null || row.parcel_reference === ''
                ? null
                : String(row.parcel_reference),
          }
        : null,
    }));
  }

  async unreadCount(ctx: DataAccessContext): Promise<number> {
    this.assertInboxRole(ctx);
    return this.web.unreadCount(ctx.userId!);
  }

  async markRead(ctx: DataAccessContext, id: string): Promise<CustomerNotification> {
    this.assertInboxRole(ctx);
    const item = await this.web.markRead(ctx.userId!, id);
    return item;
  }

  async markAllRead(ctx: DataAccessContext): Promise<number> {
    this.assertInboxRole(ctx);
    return this.web.markAllRead(ctx.userId!);
  }

  private assertInboxRole(ctx: DataAccessContext): void {
    if (ctx.role === 'customer') {
      assertCustomerRole(ctx);
      return;
    }
    if (ctx.role === 'courier') {
      assertCourierRole(ctx);
      return;
    }
    throw new AccessDeniedError('Customer or courier role required');
  }

  async notifyCourierDeactivated(userIds: string[], courierName: string): Promise<void> {
    const message = `Le coursier ${courierName} a désactivé son compte.`;
    for (const userId of userIds) {
      try {
        await this.web.emitToUser({
          userId,
          type: 'courier.deactivated',
          title: 'Compte coursier',
          message,
          entityType: 'driver_dossier',
          entityId: userId,
          dedupeKey: `courier.deactivated:${userId}:${courierName}`,
          sendPush: false,
        });
      } catch (error) {
        console.error('[eveider:notify] courier.deactivated failed', { userId, error });
      }
    }
  }

  async resolveCustomerUserId(parcel: Pick<Parcel, 'customerId' | 'recipientPhone'>) {
    if (parcel.customerId) return parcel.customerId;

    const user = await this.db.query(
      `SELECT id FROM users WHERE phone = $1 AND is_customer = true LIMIT 1`,
      [parcel.recipientPhone],
    );
    return user.rows[0] ? String(user.rows[0].id) : null;
  }
}

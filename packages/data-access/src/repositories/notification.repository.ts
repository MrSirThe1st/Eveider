import { PARCEL_STATUS_LABELS, type ParcelStatus } from '@eveider/domain';
import { AccessDeniedError, assertCustomerRole, type DataAccessContext } from '../context.js';
import type { Queryable } from '../db/index.js';
import { mapNotification, mapParcel } from '../db/mappers.js';
import type { Notification, Parcel } from '../db/types.js';
import { sendParcelStatusWhatsApp } from '../messaging/parcel-whatsapp.js';

export type CustomerNotification = Notification & {
  parcel: { id: string; trackingNumber: string; reference: string | null } | null;
};

const CUSTOMER_NOTIFY_STATUSES: ParcelStatus[] = [
  'in_transit',
  'delivered_to_locker',
  'ready_for_pickup',
  'collected',
];

export class NotificationRepository {
  constructor(private readonly db: Queryable) {}

  async notifyParcelCreatedForCustomer(
    parcelId: string,
    userId: string,
    businessName: string,
  ): Promise<void> {
    const parcel = await this.db.query(
      `SELECT tracking_number, reference FROM parcels WHERE id = $1 LIMIT 1`,
      [parcelId],
    );
    if (!parcel.rows[0]) return;

    const message = `${businessName} vous a envoyé un colis prêt pour retrait.`;

    const duplicate = await this.db.query(`SELECT id FROM notifications WHERE user_id = $1 AND parcel_id = $2 AND message = $3 AND channel = 'in_app' LIMIT 1`, [userId, parcelId, message]);
    if (!duplicate.rows[0]) await this.db.query(`INSERT INTO notifications (user_id, parcel_id, channel, message) VALUES ($1, $2, 'in_app', $3)`, [userId, parcelId, message]);
  }

  async notifyParcelStatusChange(parcelId: string, newStatus: ParcelStatus): Promise<void> {
    if (!CUSTOMER_NOTIFY_STATUSES.includes(newStatus)) return;

    const result = await this.db.query(
      `SELECT p.*, l.name AS locker_name FROM parcels p LEFT JOIN lockers l ON l.id = p.locker_id WHERE p.id = $1 LIMIT 1`,
      [parcelId],
    );
    const row = result.rows[0];
    if (!row) return;
    const parcel = mapParcel(row);

    const userId = await this.resolveCustomerUserId(parcel);
    if (userId) {
      const message = this.buildMessage(
        parcel.trackingNumber,
        newStatus,
        row.locker_name == null ? null : String(row.locker_name),
      );

      const duplicate = await this.db.query(`SELECT id FROM notifications WHERE user_id = $1 AND parcel_id = $2 AND message = $3 AND channel = 'in_app' LIMIT 1`, [userId, parcelId, message]);
      if (!duplicate.rows[0]) await this.db.query(`INSERT INTO notifications (user_id, parcel_id, channel, message) VALUES ($1, $2, 'in_app', $3)`, [userId, parcelId, message]);
    }

    // Phone-first WhatsApp — works even if the recipient has no app account yet.
    try {
      await sendParcelStatusWhatsApp(this.db, parcelId, newStatus);
    } catch (error) {
      console.error('[eveider:whatsapp] unexpected error', { parcelId, newStatus, error });
    }
  }

  async listForCustomer(ctx: DataAccessContext): Promise<CustomerNotification[]> {
    assertCustomerRole(ctx);

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
    assertCustomerRole(ctx);

    const result = await this.db.query(`SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND channel = 'in_app' AND sent_at IS NULL`, [ctx.userId!]);
    return Number(result.rows[0]?.count ?? 0);
  }

  async markRead(ctx: DataAccessContext, id: string): Promise<CustomerNotification> {
    assertCustomerRole(ctx);

    const found = await this.db.query(`SELECT * FROM notifications WHERE id = $1 LIMIT 1`, [id]);
    const row = found.rows[0];
    if (!row) throw new Error(`Notification ${id} not found`);
    const notification = mapNotification(row);
    if (notification.userId !== ctx.userId) {
      throw new AccessDeniedError('Notification hors périmètre');
    }

    const result = await this.db.query(`UPDATE notifications SET sent_at = COALESCE(sent_at, NOW()) WHERE id = $1 RETURNING *`, [id]);
    const updated = mapNotification(result.rows[0]!);
    const parcel = updated.parcelId
      ? await this.db.query(
          `SELECT id, tracking_number, reference FROM parcels WHERE id = $1`,
          [updated.parcelId],
        )
      : null;
    return {
      ...updated,
      parcel: parcel?.rows[0]
        ? {
            id: String(parcel.rows[0].id),
            trackingNumber: String(parcel.rows[0].tracking_number),
            reference:
              parcel.rows[0].reference == null || parcel.rows[0].reference === ''
                ? null
                : String(parcel.rows[0].reference),
          }
        : null,
    };
  }

  private async resolveCustomerUserId(parcel: Pick<Parcel, 'customerId' | 'recipientPhone'>) {
    if (parcel.customerId) return parcel.customerId;

    const user = await this.db.query(`SELECT id FROM users WHERE phone = $1 AND role = 'customer' LIMIT 1`, [parcel.recipientPhone]);
    return user.rows[0] ? String(user.rows[0].id) : null;
  }

  private buildMessage(trackingNumber: string, status: ParcelStatus, lockerName?: string | null) {
    const label = PARCEL_STATUS_LABELS[status];
    if (status === 'ready_for_pickup' && lockerName) {
      return `Colis ${trackingNumber} — ${label} · ${lockerName}`;
    }
    return `Colis ${trackingNumber} — ${label}`;
  }
}

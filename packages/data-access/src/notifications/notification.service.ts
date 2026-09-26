import { ACTIVE_DELIVERY_STATUSES } from '@eveider/domain';
import type { Queryable } from '../db/index.js';
import { mapNotification } from '../db/mappers.js';
import { ExpoPushProvider } from './expo-push.js';
import {
  resolveNotificationEmailActionUrl,
  sendOperationalNotificationEmail,
} from './operational-email.js';
import { resolveNotificationRecipients } from './recipients.js';
import {
  EMAIL_ELIGIBLE_NOTIFICATION_TYPES,
  HIGH_PRIORITY_MOBILE_TYPES,
  type AdminOperationalBadges,
  type BusinessOperationalBadges,
  type EmitUserNotificationInput,
  type EmitWebNotificationInput,
  type MobileNotificationType,
  type NotificationType,
  type WebNotificationEntityType,
} from './types.js';

export type WebInboxItem = ReturnType<typeof mapNotification> & {
  parcel: { id: string; trackingNumber: string; reference: string | null } | null;
};

/**
 * Central notification emitter + inbox (web + mobile).
 * Domain repositories call `emit` / `emitToUser` after meaningful events — never the frontend.
 * Push is a delivery channel for the same in_app row (no duplicate push rows).
 */
export class NotificationService {
  readonly push: ExpoPushProvider;

  constructor(private readonly db: Queryable) {
    this.push = new ExpoPushProvider(db);
  }

  async emit(input: EmitWebNotificationInput): Promise<void> {
    const businessId =
      input.audience === 'business_web' ? (input.businessId ?? null) : (input.businessId ?? null);
    if (input.audience === 'business_web' && !businessId) return;

    const recipients = await resolveNotificationRecipients(
      this.db,
      input.audience,
      businessId,
    );
    if (recipients.length === 0) return;

    const shouldEmail = EMAIL_ELIGIBLE_NOTIFICATION_TYPES.has(input.type);
    const actionUrl = resolveNotificationEmailActionUrl({
      audience: input.audience,
      entityType: input.entityType,
      entityId: input.entityId,
    });

    for (const recipient of recipients) {
      const created = await this.insertInAppIfNew({
        userId: recipient.userId,
        parcelId: input.parcelId ?? null,
        businessId,
        type: input.type,
        title: input.title,
        message: input.message,
        entityType: input.entityType,
        entityId: input.entityId,
        dedupeKey: `${input.dedupeKey}:${recipient.userId}`,
      });

      if (!created || !shouldEmail) continue;
      if (!recipient.emailNotificationsEnabled || !recipient.email) continue;

      try {
        const result = await sendOperationalNotificationEmail({
          to: recipient.email,
          title: input.title,
          message: input.message,
          actionUrl,
        });
        if (result.ok === true) {
          await this.db.query(
            `UPDATE notifications
             SET sent_at = COALESCE(sent_at, NOW())
             WHERE user_id = $1 AND dedupe_key = $2 AND channel = 'in_app'`,
            [recipient.userId, `${input.dedupeKey}:${recipient.userId}`],
          );
        }
      } catch (error) {
        console.error('[eveider:notify-email] send failed', {
          type: input.type,
          userId: recipient.userId,
          error,
        });
      }
    }
  }

  /**
   * Create one typed in-app notification for a known user, then best-effort Expo push.
   * Idempotent via dedupe_key. Push failure never throws.
   */
  async emitToUser(input: EmitUserNotificationInput): Promise<string | null> {
    const dedupeKey = `${input.dedupeKey}:${input.userId}`;
    const notificationId = await this.insertInAppIfNew({
      userId: input.userId,
      parcelId: input.parcelId ?? null,
      businessId: input.businessId ?? null,
      type: input.type,
      title: input.title,
      message: input.message,
      entityType: input.entityType,
      entityId: input.entityId,
      dedupeKey,
    });

    if (!notificationId || input.sendPush === false) return notificationId;

    try {
      const high = HIGH_PRIORITY_MOBILE_TYPES.has(input.type as MobileNotificationType);
      await this.push.sendToUser(input.userId, {
        title: input.title,
        body: input.message,
        priority: high ? 'high' : 'default',
        channelId: 'eveider_operations',
        data: {
          type: input.type,
          entity_type: input.entityType,
          entity_id: input.entityId,
          notification_id: notificationId,
          ...(input.parcelId ? { parcel_id: input.parcelId } : {}),
          ...(input.entityType === 'delivery' ? { delivery_id: input.entityId } : {}),
        },
      });
    } catch (error) {
      console.error('[eveider:notify-push] send failed', {
        type: input.type,
        userId: input.userId,
        error,
      });
    }

    return notificationId;
  }

  async listForUser(
    userId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<WebInboxItem[]> {
    const limit = Math.min(Math.max(options?.limit ?? 30, 1), 100);
    const offset = Math.max(options?.offset ?? 0, 0);
    const result = await this.db.query(
      `SELECT n.*,
              p.id AS parcel_id_relation,
              p.tracking_number AS parcel_tracking_number,
              p.reference AS parcel_reference
       FROM notifications n
       LEFT JOIN parcels p ON p.id = n.parcel_id
       WHERE n.user_id = $1 AND n.channel = 'in_app'
       ORDER BY n.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset],
    );
    return result.rows.map((row) => this.mapInboxRow(row));
  }

  async unreadCount(userId: string): Promise<number> {
    const result = await this.db.query(
      `SELECT COUNT(*)::int AS count
       FROM notifications
       WHERE user_id = $1 AND channel = 'in_app' AND read_at IS NULL`,
      [userId],
    );
    return Number(result.rows[0]?.count ?? 0);
  }

  async markRead(userId: string, id: string): Promise<WebInboxItem> {
    const found = await this.db.query(
      `SELECT id FROM notifications WHERE id = $1 AND user_id = $2 AND channel = 'in_app' LIMIT 1`,
      [id, userId],
    );
    if (!found.rows[0]) throw new Error('Notification introuvable');

    await this.db.query(
      `UPDATE notifications
       SET read_at = COALESCE(read_at, NOW())
       WHERE id = $1`,
      [id],
    );

    const result = await this.db.query(
      `SELECT n.*,
              p.id AS parcel_id_relation,
              p.tracking_number AS parcel_tracking_number,
              p.reference AS parcel_reference
       FROM notifications n
       LEFT JOIN parcels p ON p.id = n.parcel_id
       WHERE n.id = $1`,
      [id],
    );
    return this.mapInboxRow(result.rows[0]!);
  }

  async markAllRead(userId: string): Promise<number> {
    const result = await this.db.query(
      `UPDATE notifications
       SET read_at = NOW()
       WHERE user_id = $1 AND channel = 'in_app' AND read_at IS NULL`,
      [userId],
    );
    return result.rowCount ?? 0;
  }

  async getEmailNotificationsEnabled(userId: string): Promise<boolean> {
    const result = await this.db.query(
      `SELECT email_notifications_enabled FROM users WHERE id = $1 LIMIT 1`,
      [userId],
    );
    if (!result.rows[0]) throw new Error('Utilisateur introuvable');
    return result.rows[0].email_notifications_enabled !== false;
  }

  async setEmailNotificationsEnabled(userId: string, enabled: boolean): Promise<boolean> {
    const result = await this.db.query(
      `UPDATE users
       SET email_notifications_enabled = $2, updated_at = NOW()
       WHERE id = $1
       RETURNING email_notifications_enabled`,
      [userId, enabled],
    );
    if (!result.rows[0]) throw new Error('Utilisateur introuvable');
    return result.rows[0].email_notifications_enabled !== false;
  }

  async getPushNotificationsEnabled(userId: string): Promise<boolean> {
    const result = await this.db.query(
      `SELECT push_notifications_enabled FROM users WHERE id = $1 LIMIT 1`,
      [userId],
    );
    if (!result.rows[0]) throw new Error('Utilisateur introuvable');
    return result.rows[0].push_notifications_enabled !== false;
  }

  async setPushNotificationsEnabled(userId: string, enabled: boolean): Promise<boolean> {
    const result = await this.db.query(
      `UPDATE users
       SET push_notifications_enabled = $2, updated_at = NOW()
       WHERE id = $1
       RETURNING push_notifications_enabled`,
      [userId, enabled],
    );
    if (!result.rows[0]) throw new Error('Utilisateur introuvable');
    return result.rows[0].push_notifications_enabled !== false;
  }

  async getAdminOperationalBadges(): Promise<AdminOperationalBadges> {
    const result = await this.db.query(
      `SELECT
         (
           SELECT COUNT(*)::int FROM parcels p
           WHERE p.status = 'created' AND p.pickup_type = 'courier_pickup'
             AND NOT EXISTS (
               SELECT 1 FROM deliveries d
               WHERE d.parcel_id = p.id AND d.kind = 'outbound'
                 AND d.status = ANY($1)
             )
         ) AS awaiting_assignment,
         (
           SELECT COUNT(*)::int FROM parcel_returns pr
           JOIN parcels p ON p.id = pr.parcel_id
           WHERE pr.status = 'awaiting_pickup' AND pr.method = 'eveider_return'
             AND p.status = 'return_at_point'
             AND NOT EXISTS (
               SELECT 1 FROM deliveries d
               WHERE d.parcel_id = p.id AND d.kind = 'customer_return'
                 AND d.status = ANY($1)
             )
         ) AS awaiting_return_assignment,
         (
           SELECT COUNT(*)::int FROM business_verifications bv
           WHERE bv.status = 'pending'
             AND bv.id = (
               SELECT id FROM business_verifications
               WHERE business_id = bv.business_id
               ORDER BY created_at DESC
               LIMIT 1
             )
         ) AS pending_org_verifications,
         (
           SELECT COUNT(*)::int FROM driver_dossiers
           WHERE status = 'pending_review'
         ) AS pending_driver_reviews,
         (
           SELECT COUNT(*)::int FROM issues
           WHERE status = ANY($2)
         ) AS open_issues`,
      [
        ACTIVE_DELIVERY_STATUSES,
        ['open', 'in_progress'],
      ],
    );
    const row = result.rows[0] ?? {};
    const awaitingAssignment = Number(row.awaiting_assignment ?? 0);
    const awaitingReturnAssignment = Number(row.awaiting_return_assignment ?? 0);
    return {
      awaitingAssignment,
      awaitingReturnAssignment,
      livraisons: awaitingAssignment + awaitingReturnAssignment,
      organisations: Number(row.pending_org_verifications ?? 0),
      flotte: Number(row.pending_driver_reviews ?? 0),
      incidents: Number(row.open_issues ?? 0),
    };
  }

  async getBusinessOperationalBadges(businessId: string): Promise<BusinessOperationalBadges> {
    const result = await this.db.query(
      `SELECT
         (SELECT COUNT(*)::int FROM parcels
           WHERE business_id = $1 AND status = 'created' AND pickup_type = 'courier_pickup') AS awaiting_handoff,
         (SELECT COUNT(*)::int FROM parcels
           WHERE business_id = $1 AND status = 'created' AND pickup_type = 'merchant_dropoff') AS awaiting_deposit,
         (SELECT COUNT(*)::int FROM parcel_returns pr
           JOIN parcels p ON p.id = pr.parcel_id
          WHERE p.business_id = $1 AND pr.status = 'requested') AS returns_to_review,
         (SELECT COUNT(*)::int FROM parcel_returns pr
           JOIN parcels p ON p.id = pr.parcel_id
          WHERE p.business_id = $1
            AND pr.method = 'business_pickup'
            AND p.status = 'return_at_point') AS returns_to_collect`,
      [businessId],
    );
    const row = result.rows[0] ?? {};
    const awaitingHandoff = Number(row.awaiting_handoff ?? 0);
    const awaitingDeposit = Number(row.awaiting_deposit ?? 0);
    const returnsToReview = Number(row.returns_to_review ?? 0);
    const returnsToCollect = Number(row.returns_to_collect ?? 0);
    return {
      awaitingHandoff,
      awaitingDeposit,
      returnsToReview,
      returnsToCollect,
      colis: awaitingHandoff + awaitingDeposit + returnsToReview + returnsToCollect,
    };
  }

  private async insertInAppIfNew(input: {
    userId: string;
    parcelId: string | null;
    businessId: string | null;
    type: NotificationType;
    title: string;
    message: string;
    entityType: WebNotificationEntityType;
    entityId: string;
    dedupeKey: string;
  }): Promise<string | null> {
    const duplicate = await this.db.query(
      `SELECT id FROM notifications
       WHERE user_id = $1 AND channel = 'in_app' AND dedupe_key = $2
       LIMIT 1`,
      [input.userId, input.dedupeKey],
    );
    if (duplicate.rows[0]) return null;

    const inserted = await this.db.query(
      `INSERT INTO notifications (
         user_id, parcel_id, business_id, channel, type, title, message,
         entity_type, entity_id, dedupe_key
       ) VALUES ($1, $2, $3, 'in_app', $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [
        input.userId,
        input.parcelId,
        input.businessId,
        input.type,
        input.title,
        input.message,
        input.entityType,
        input.entityId,
        input.dedupeKey,
      ],
    );
    return inserted.rows[0] ? String(inserted.rows[0].id) : null;
  }

  private mapInboxRow(row: Record<string, unknown>): WebInboxItem {
    const base = mapNotification(row);
    return {
      ...base,
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
    };
  }
}

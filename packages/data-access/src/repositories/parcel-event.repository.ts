import type {
  DeliveryStatus,
  ParcelEventActorType,
  ParcelEventType,
  ParcelStatus,
} from '@eveider/domain';
import {
  AccessDeniedError,
  assertAdmin,
  assertCompanyPermission,
  isPlatformAdminContext,
  type DataAccessContext,
} from '../context.js';
import type { Queryable } from '../db/index.js';
import { mapParcelEvent } from '../db/mappers.js';
import type { ParcelEvent } from '../db/types.js';

export type ParcelEventActor = {
  actorType: ParcelEventActorType;
  actorUserId: string | null;
};

export type AppendParcelEventInput = {
  parcelId: string;
  eventType: ParcelEventType;
  actor: ParcelEventActor;
  deliveryId?: string | null;
  issueId?: string | null;
  compartmentId?: string | null;
  previousParcelStatus?: ParcelStatus | null;
  newParcelStatus?: ParcelStatus | null;
  previousDeliveryStatus?: DeliveryStatus | null;
  newDeliveryStatus?: DeliveryStatus | null;
  payload?: Record<string, unknown>;
};

export type ParcelEventListItem = ParcelEvent & {
  actorFullName: string | null;
  actorEmail: string | null;
};

export function resolveEventActor(ctx: DataAccessContext | null | undefined): ParcelEventActor {
  if (ctx?.apiKeyId) {
    return { actorType: 'api_key', actorUserId: null };
  }
  if (ctx?.userId) {
    return { actorType: 'user', actorUserId: ctx.userId };
  }
  return { actorType: 'system', actorUserId: null };
}

function shouldDispatchOrganizationNotify(): boolean {
  return process.env.VITEST !== 'true';
}

export async function appendParcelEvent(
  db: Queryable,
  input: AppendParcelEventInput,
): Promise<ParcelEvent> {
  const result = await db.query(
    `INSERT INTO parcel_events (
       parcel_id, delivery_id, issue_id, compartment_id,
       event_type, actor_type, actor_user_id,
       previous_parcel_status, new_parcel_status,
       previous_delivery_status, new_delivery_status,
       payload
     ) VALUES (
       $1, $2, $3, $4,
       $5, $6, $7,
       $8, $9,
       $10, $11,
       $12::jsonb
     )
     RETURNING *`,
    [
      input.parcelId,
      input.deliveryId ?? null,
      input.issueId ?? null,
      input.compartmentId ?? null,
      input.eventType,
      input.actor.actorType,
      input.actor.actorUserId,
      input.previousParcelStatus ?? null,
      input.newParcelStatus ?? null,
      input.previousDeliveryStatus ?? null,
      input.newDeliveryStatus ?? null,
      JSON.stringify(input.payload ?? {}),
    ],
  );
  const event = mapParcelEvent(result.rows[0]!);
  if (shouldDispatchOrganizationNotify()) {
    try {
      const { notifyOrganizationOfParcelEvent } = await import('../org-api/notify.js');
      await notifyOrganizationOfParcelEvent(db, event);
    } catch (error) {
      console.error('[eveider:org-notify] dispatch failed', {
        parcelId: event.parcelId,
        eventType: event.eventType,
        error,
      });
    }
  }
  return event;
}

/** Best-effort event write — never throws (notification / side-channel logging). */
export async function appendParcelEventSafe(
  db: Queryable,
  input: AppendParcelEventInput,
): Promise<void> {
  try {
    await appendParcelEvent(db, input);
  } catch (error) {
    console.error('[eveider:parcel-event] append failed', {
      parcelId: input.parcelId,
      eventType: input.eventType,
      error,
    });
  }
}

export class ParcelEventRepository {
  constructor(private readonly db: Queryable) {}

  async append(input: AppendParcelEventInput): Promise<ParcelEvent> {
    return appendParcelEvent(this.db, input);
  }

  /**
   * Chronological timeline (oldest → newest) for admin or owning-business parcel detail.
   */
  async listForParcel(ctx: DataAccessContext, parcelId: string): Promise<ParcelEventListItem[]> {
    if (isPlatformAdminContext(ctx)) {
      assertAdmin(ctx);
    } else {
      assertCompanyPermission(ctx, 'view_parcels');
      if (!ctx.businessId && !ctx.organizationId) {
        throw new AccessDeniedError('Compte entreprise requis');
      }
      const businessId = ctx.organizationId ?? ctx.businessId!;
      const owned = await this.db.query(
        `SELECT 1 FROM parcels WHERE id = $1 AND business_id = $2 LIMIT 1`,
        [parcelId, businessId],
      );
      if (!owned.rows[0]) {
        throw new AccessDeniedError('Colis hors périmètre');
      }
    }

    const result = await this.db.query(
      `SELECT e.*,
              u.full_name AS actor_full_name,
              u.email AS actor_email
       FROM parcel_events e
       LEFT JOIN users u ON u.id = e.actor_user_id
       WHERE e.parcel_id = $1
       ORDER BY e.created_at ASC, e.id ASC`,
      [parcelId],
    );

    return result.rows.map((row) => ({
      ...mapParcelEvent(row),
      actorFullName: row.actor_full_name == null ? null : String(row.actor_full_name),
      actorEmail: row.actor_email == null ? null : String(row.actor_email),
    }));
  }
}

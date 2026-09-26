import {
  ACTIVE_DELIVERY_STATUSES,
  ACTIVE_PARCEL_RETURN_STATUSES,
  canAcceptDropOff,
  canAssignCustomerReturnDelivery,
  canCancelParcelReturn,
  canCollectCustomerReturnFromLocker,
  canCompleteBusinessPickup,
  canCompleteEveiderReturnToBusiness,
  canDepositCustomerReturn,
  canRequestCustomerReturn,
  canTransitionParcelForCustomerReturn,
  canTransitionParcelReturn,
  generatePickupPinCode,
  isEligibleCustomerReturnLockerType,
  isNetworkLockerType,
  transitionDelivery,
  transitionParcel,
  transitionParcelReturn,
  usesCompartmentGrid,
  type DeliveryKind,
  type DeliveryStatus,
  type LockerType,
  type ParcelReturnMethod,
  type ParcelReturnStatus,
  type ParcelStatus,
} from '@eveider/domain';
import {
  AccessDeniedError,
  assertAdmin,
  assertBusinessScope,
  assertCompanyPermission,
  assertCustomerOwnsParcel,
  assertCustomerRole,
  type DataAccessContext,
} from '../context.js';
import type { Queryable } from '../db/index.js';
import { withTransaction } from '../db/pool.js';
import { mapCompartment, mapParcelReturn } from '../db/mappers.js';
import type { ParcelReturn } from '../db/types.js';
import {
  appendParcelEvent,
  resolveEventActor,
} from './parcel-event.repository.js';
import { CommercialRepository } from './commercial.repository.js';
import { NotificationRepository } from './notification.repository.js';

export type ParcelReturnRecord = ParcelReturn & {
  returnLocker: { id: string; name: string; address: string } | null;
  compartmentLabel: string | null;
};

export type AuthorizeParcelReturnInput = {
  method: ParcelReturnMethod;
  returnLockerId: string;
};

export type ConfirmRecipientDepositInput = {
  lockerId: string;
  returnCode: string;
  compartmentId?: string;
};

export type CustomerReturnDeliveryRef = {
  id: string;
  parcelId: string;
  status: DeliveryStatus;
  kind: DeliveryKind;
  parcel: {
    status: ParcelStatus;
    compartmentId: string | null;
    lockerId: string | null;
  };
};

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: string }).code === '23505'
  );
}

async function allocateReturnCode(db: Queryable): Promise<string> {
  for (let attempt = 0; attempt < 24; attempt++) {
    const code = generatePickupPinCode();
    const existing = await db.query(
      `SELECT id FROM parcel_returns WHERE return_code = $1 LIMIT 1`,
      [code],
    );
    if (!existing.rows[0]) return code;
  }
  throw new Error('Impossible de générer un code retour unique');
}

export class ParcelReturnRepository {
  constructor(
    private readonly db: Queryable,
    private readonly notifications: NotificationRepository = new NotificationRepository(db),
  ) {}

  async findById(id: string): Promise<ParcelReturnRecord | null> {
    return this.loadById(id);
  }

  async findLatestForParcel(parcelId: string): Promise<ParcelReturnRecord | null> {
    const result = await this.db.query(
      `${this.selectSql()}
       WHERE pr.parcel_id = $1
       ORDER BY pr.created_at DESC
       LIMIT 1`,
      [parcelId],
    );
    const row = result.rows[0];
    return row ? this.mapRecord(row) : null;
  }

  async findActiveForParcel(parcelId: string): Promise<ParcelReturnRecord | null> {
    const result = await this.db.query(
      `${this.selectSql()}
       WHERE pr.parcel_id = $1 AND pr.status = ANY($2)
       ORDER BY pr.created_at DESC
       LIMIT 1`,
      [parcelId, ACTIVE_PARCEL_RETURN_STATUSES],
    );
    const row = result.rows[0];
    return row ? this.mapRecord(row) : null;
  }

  async listLatestByParcelIds(
    parcelIds: string[],
  ): Promise<Map<string, ParcelReturnRecord>> {
    const map = new Map<string, ParcelReturnRecord>();
    if (parcelIds.length === 0) return map;
    const result = await this.db.query(
      `${this.selectSql()}
       WHERE pr.parcel_id = ANY($1)
         AND pr.id = (
           SELECT pr2.id FROM parcel_returns pr2
           WHERE pr2.parcel_id = pr.parcel_id
           ORDER BY pr2.created_at DESC
           LIMIT 1
         )`,
      [parcelIds],
    );
    for (const row of result.rows) {
      const record = this.mapRecord(row);
      map.set(record.parcelId, record);
    }
    return map;
  }

  async listForBusiness(
    ctx: DataAccessContext,
    businessId: string,
  ): Promise<ParcelReturnRecord[]> {
    assertBusinessScope(ctx, businessId);
    const result = await this.db.query(
      `${this.selectSql()}
       WHERE pr.business_id = $1
       ORDER BY pr.created_at DESC`,
      [businessId],
    );
    return result.rows.map((row) => this.mapRecord(row));
  }

  async requestByCustomer(ctx: DataAccessContext, parcelId: string): Promise<ParcelReturnRecord> {
    assertCustomerRole(ctx);
    const parcel = await this.loadParcel(parcelId);
    if (!parcel) throw new Error('Colis introuvable');
    assertCustomerOwnsParcel(ctx, parcel.customerId, parcel.recipientPhone);

    if (!canRequestCustomerReturn(parcel.status)) {
      throw new Error('Un retour client n’est possible qu’après le retrait du colis');
    }

    const actor = resolveEventActor(ctx);
    try {
      const created = await withTransaction(async (tx) => {
        const inserted = await tx.query(
          `INSERT INTO parcel_returns (parcel_id, business_id, status, requested_at)
           VALUES ($1, $2, 'requested', NOW())
           RETURNING *`,
          [parcel.id, parcel.businessId],
        );
        const mapped = mapParcelReturn(inserted.rows[0]!);
        await appendParcelEvent(tx, {
          parcelId: parcel.id,
          eventType: 'parcel_return.requested',
          actor,
          payload: { parcelReturnId: mapped.id },
        });
        return mapped;
      });
      const loaded = await this.loadById(created.id);
      if (!loaded) throw new Error('Retour introuvable');

      try {
        const tracking = await this.db.query(
          `SELECT tracking_number FROM parcels WHERE id = $1 LIMIT 1`,
          [parcel.id],
        );
        const trackingNumber = tracking.rows[0]
          ? String(tracking.rows[0].tracking_number)
          : parcel.id;
        await this.notifications.web.emit({
          type: 'return.requested',
          audience: 'business_web',
          businessId: parcel.businessId,
          title: 'Retour demandé',
          message: `Le destinataire a demandé un retour pour ${trackingNumber}.`,
          entityType: 'parcel',
          entityId: parcel.id,
          parcelId: parcel.id,
          dedupeKey: `return.requested:${loaded.id}`,
        });
      } catch (error) {
        console.error('[eveider:web-notify] return.requested failed', error);
      }

      return loaded;
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new Error('Un retour client est déjà en cours pour ce colis');
      }
      throw err;
    }
  }

  async authorize(
    ctx: DataAccessContext,
    returnId: string,
    input: AuthorizeParcelReturnInput,
  ): Promise<ParcelReturnRecord> {
    this.assertBusinessOperator(ctx);
    const current = await this.requireById(returnId);
    assertBusinessScope(ctx, current.businessId);
    if (!canTransitionParcelReturn(current.status, 'authorized')) {
      throw new Error('Cette demande de retour n’est plus en attente');
    }

    const locker = await this.loadLocker(input.returnLockerId);
    if (!locker) throw new Error('Casier de retour introuvable');
    if (!isEligibleCustomerReturnLockerType(locker.type) || !isNetworkLockerType(locker.type)) {
      throw new Error('Seuls les casiers intelligents Eveider sont éligibles pour un retour');
    }
    if (!canAcceptDropOff(locker.status)) {
      throw new Error('Casier indisponible pour un retour');
    }

    const actor = resolveEventActor(ctx);
    const returnCode = await allocateReturnCode(this.db);
    const nextStatus = transitionParcelReturn(current.status, 'authorized');

    await withTransaction(async (tx) => {
      await tx.query(
        `UPDATE parcel_returns
         SET status = $1,
             method = $2,
             return_locker_id = $3,
             return_code = $4,
             authorized_at = NOW(),
             updated_at = NOW()
         WHERE id = $5`,
        [nextStatus, input.method, input.returnLockerId, returnCode, returnId],
      );
      await appendParcelEvent(tx, {
        parcelId: current.parcelId,
        eventType: 'parcel_return.authorized',
        actor,
        payload: {
          parcelReturnId: returnId,
          method: input.method,
          returnLockerId: input.returnLockerId,
        },
      });
      const commercial = new CommercialRepository(tx);
      await commercial.snapshotReturnCharge(tx, {
        parcelId: current.parcelId,
        businessId: current.businessId,
        method: input.method,
        returnLockerId: input.returnLockerId,
      });
    });

    const updated = await this.requireById(returnId);
    const parcel = await this.loadParcel(updated.parcelId);
    if (parcel) {
      const userId = await this.notifications.resolveCustomerUserId(parcel);
      if (userId) {
        await this.notifications.notifyCustomerReturnAuthorized({
          userId,
          parcelId: parcel.id,
          returnId: updated.id,
          businessId: updated.businessId,
        });
      }
    }
    return updated;
  }

  async reject(ctx: DataAccessContext, returnId: string): Promise<ParcelReturnRecord> {
    this.assertBusinessOperator(ctx);
    const current = await this.requireById(returnId);
    assertBusinessScope(ctx, current.businessId);
    if (!canTransitionParcelReturn(current.status, 'rejected')) {
      throw new Error('Ce retour ne peut plus être refusé');
    }

    const actor = resolveEventActor(ctx);
    const nextStatus = transitionParcelReturn(current.status, 'rejected');
    await withTransaction(async (tx) => {
      await tx.query(
        `UPDATE parcel_returns SET status = $1, updated_at = NOW() WHERE id = $2`,
        [nextStatus, returnId],
      );
      await appendParcelEvent(tx, {
        parcelId: current.parcelId,
        eventType: 'parcel_return.rejected',
        actor,
        payload: { parcelReturnId: returnId },
      });
    });
    return this.requireById(returnId);
  }

  async cancel(ctx: DataAccessContext, returnId: string): Promise<ParcelReturnRecord> {
    const current = await this.requireById(returnId);
    if (ctx.role === 'customer') {
      assertCustomerRole(ctx);
      const parcel = await this.loadParcel(current.parcelId);
      if (!parcel) throw new Error('Colis introuvable');
      assertCustomerOwnsParcel(ctx, parcel.customerId, parcel.recipientPhone);
    } else {
      this.assertBusinessOperator(ctx);
      assertBusinessScope(ctx, current.businessId);
    }

    if (!canCancelParcelReturn(current.status)) {
      throw new Error('Ce retour ne peut plus être annulé');
    }

    const actor = resolveEventActor(ctx);
    const nextStatus = transitionParcelReturn(current.status, 'cancelled');
    await withTransaction(async (tx) => {
      await tx.query(
        `UPDATE parcel_returns SET status = $1, updated_at = NOW() WHERE id = $2`,
        [nextStatus, returnId],
      );
      await appendParcelEvent(tx, {
        parcelId: current.parcelId,
        eventType: 'parcel_return.cancelled',
        actor,
        payload: { parcelReturnId: returnId },
      });
    });
    return this.requireById(returnId);
  }

  /**
   * Software stand-in for confirmed recipient deposit at the authorized SMART_LOCKER.
   * Future PLC: tracking number + return code → validate → occupy compartment → confirm.
   * Credential: parcel_returns.return_code (not outbound pickup_pins).
   */
  async confirmRecipientDeposit(
    ctx: DataAccessContext,
    parcelId: string,
    input: ConfirmRecipientDepositInput,
  ): Promise<ParcelReturnRecord> {
    if (ctx.role === 'admin') {
      assertAdmin(ctx);
    } else {
      assertCustomerRole(ctx);
    }

    const parcel = await this.loadParcel(parcelId);
    if (!parcel) throw new Error('Colis introuvable');
    if (ctx.role === 'customer') {
      assertCustomerOwnsParcel(ctx, parcel.customerId, parcel.recipientPhone);
    }

    const current = await this.findActiveForParcel(parcelId);
    if (!current) throw new Error('Aucun retour client actif pour ce colis');

    if (current.status === 'awaiting_pickup' && parcel.status === 'return_at_point') {
      if (current.returnLockerId !== input.lockerId) {
        throw new Error('Dépôt au mauvais casier');
      }
      return current;
    }

    if (!canDepositCustomerReturn(current.status)) {
      throw new Error('Le dépôt n’est possible qu’après autorisation');
    }
    if (!current.returnLockerId || current.returnLockerId !== input.lockerId) {
      throw new Error('Dépôt au mauvais casier');
    }
    if (!current.returnCode || current.returnCode !== input.returnCode.trim()) {
      throw new Error('Code retour invalide');
    }
    if (parcel.status !== 'collected' || !canTransitionParcelForCustomerReturn(parcel.status, 'return_at_point')) {
      throw new Error('Le colis n’est pas en état d’être déposé en retour');
    }

    const locker = await this.loadLocker(current.returnLockerId);
    if (!locker) throw new Error('Casier de retour introuvable');
    if (!isEligibleCustomerReturnLockerType(locker.type)) {
      throw new Error('Seuls les casiers intelligents Eveider sont éligibles pour un retour');
    }
    if (!canAcceptDropOff(locker.status)) {
      throw new Error('Casier indisponible — dépôt impossible');
    }
    if (!usesCompartmentGrid(locker.type)) {
      throw new Error('Seuls les casiers intelligents Eveider sont éligibles pour un retour');
    }

    const compartment = await this.reserveCompartment(
      current.returnLockerId,
      input.compartmentId ?? null,
    );
    return this.applyRecipientReturnDeposit(ctx, {
      parcel,
      current,
      lockerId: current.returnLockerId,
      compartment,
    });
  }

  /**
   * Physical confirmation after locker authorization (or software stand-in).
   * Credentials must already have been checked by the caller.
   */
  async applyRecipientReturnDeposit(
    ctx: DataAccessContext,
    input: {
      parcel: {
        id: string;
        status: ParcelStatus;
      };
      current: ParcelReturnRecord;
      lockerId: string;
      compartment: { id: string; label: string };
    },
  ): Promise<ParcelReturnRecord> {
    const { parcel, current, lockerId, compartment } = input;
    if (current.status === 'awaiting_pickup' && parcel.status === 'return_at_point') {
      return current;
    }

    const actor = resolveEventActor(ctx);
    const parcelStatus = transitionParcel(parcel.status, 'return_at_point');
    const returnStatus = transitionParcelReturn(current.status, 'awaiting_pickup');

    await withTransaction(async (tx) => {
      await tx.query(
        `UPDATE compartments SET status = 'occupied', updated_at = NOW() WHERE id = $1`,
        [compartment.id],
      );
      await tx.query(
        `UPDATE parcels
         SET status = $1, locker_id = $2, compartment_id = $3, updated_at = NOW()
         WHERE id = $4`,
        [parcelStatus, lockerId, compartment.id, parcel.id],
      );
      await tx.query(
        `UPDATE parcel_returns
         SET status = $1, compartment_id = $2, deposited_at = NOW(), updated_at = NOW()
         WHERE id = $3`,
        [returnStatus, compartment.id, current.id],
      );
      await appendParcelEvent(tx, {
        parcelId: parcel.id,
        compartmentId: compartment.id,
        eventType: 'compartment.occupied',
        actor,
        previousParcelStatus: parcel.status,
        newParcelStatus: parcelStatus,
        payload: { lockerId, reason: 'customer_return_deposit' },
      });
      await appendParcelEvent(tx, {
        parcelId: parcel.id,
        compartmentId: compartment.id,
        eventType: 'parcel.status_changed',
        actor,
        previousParcelStatus: parcel.status,
        newParcelStatus: parcelStatus,
      });
      await appendParcelEvent(tx, {
        parcelId: parcel.id,
        compartmentId: compartment.id,
        eventType: 'parcel_return.deposited',
        actor,
        previousParcelStatus: parcel.status,
        newParcelStatus: parcelStatus,
        payload: { parcelReturnId: current.id, lockerId },
      });
    });

    const updated = await this.requireById(current.id);
    if (updated.method === 'eveider_return') {
      try {
        const tracking = await this.db.query(
          `SELECT tracking_number FROM parcels WHERE id = $1 LIMIT 1`,
          [parcel.id],
        );
        const trackingNumber = tracking.rows[0]
          ? String(tracking.rows[0].tracking_number)
          : parcel.id;
        await this.notifications.web.emit({
          type: 'return.awaiting_assignment',
          audience: 'admin_ops',
          businessId: updated.businessId,
          title: 'Retour à assigner',
          message: `${trackingNumber} attend un chauffeur Eveider.`,
          entityType: 'parcel',
          entityId: parcel.id,
          parcelId: parcel.id,
          dedupeKey: `return.awaiting_assignment:${updated.id}`,
        });
      } catch (error) {
        console.error('[eveider:web-notify] return.awaiting_assignment failed', error);
      }
    }

    const fullParcel = await this.loadParcel(parcel.id);
    if (fullParcel) {
      const customerUserId = await this.notifications.resolveCustomerUserId(fullParcel);
      if (customerUserId) {
        await this.notifications.notifyCustomerReturnDeposited({
          userId: customerUserId,
          parcelId: fullParcel.id,
          returnId: updated.id,
          businessId: updated.businessId,
        });
      }
    }

    return updated;
  }

  /**
   * Flow 3B software stand-in for authorized business retrieval at the return locker.
   * No Livraison. Future PLC: business credential + tracking number.
   */
  async confirmBusinessPickup(
    ctx: DataAccessContext,
    parcelId: string,
  ): Promise<ParcelReturnRecord> {
    if (ctx.role === 'admin') {
      assertAdmin(ctx);
    } else {
      this.assertBusinessOperator(ctx);
    }

    const parcel = await this.loadParcel(parcelId);
    if (!parcel) throw new Error('Colis introuvable');
    if (ctx.role === 'business') {
      assertBusinessScope(ctx, parcel.businessId);
    }

    const current = await this.findActiveForParcel(parcelId);
    if (!current) throw new Error('Aucun retour client actif pour ce colis');

    if (current.status === 'completed' && parcel.status === 'returned') {
      return current;
    }

    if (!canCompleteBusinessPickup(current.status, current.method)) {
      throw new Error('Le retrait marchand n’est possible qu’après le dépôt du destinataire');
    }
    if (parcel.status !== 'return_at_point') {
      throw new Error('Le retrait marchand n’est possible qu’après le dépôt du destinataire');
    }

    const activeDelivery = await this.db.query(
      `SELECT id FROM deliveries
       WHERE parcel_id = $1 AND kind = 'customer_return' AND status = ANY($2)
       LIMIT 1`,
      [parcelId, ACTIVE_DELIVERY_STATUSES],
    );
    if (activeDelivery.rows[0]) {
      throw new Error('Un retrait marchand ne peut pas avoir de livraison Eveider');
    }

    const actor = resolveEventActor(ctx);
    const parcelStatus = transitionParcel(parcel.status, 'returned');
    const returnStatus = transitionParcelReturn(current.status, 'completed');
    const compartmentId = current.compartmentId ?? parcel.compartmentId;

    await withTransaction(async (tx) => {
      if (compartmentId) {
        await tx.query(
          `UPDATE compartments SET status = 'available', updated_at = NOW() WHERE id = $1`,
          [compartmentId],
        );
        await appendParcelEvent(tx, {
          parcelId: parcel.id,
          compartmentId,
          eventType: 'compartment.released',
          actor,
          previousParcelStatus: parcel.status,
          newParcelStatus: parcelStatus,
          payload: { lockerId: current.returnLockerId, reason: 'business_pickup' },
        });
      }
      await tx.query(
        `UPDATE parcels SET status = $1, compartment_id = NULL, updated_at = NOW() WHERE id = $2`,
        [parcelStatus, parcel.id],
      );
      await tx.query(
        `UPDATE parcel_returns
         SET status = $1, completed_at = NOW(), updated_at = NOW()
         WHERE id = $2`,
        [returnStatus, current.id],
      );
      await appendParcelEvent(tx, {
        parcelId: parcel.id,
        eventType: 'parcel.status_changed',
        actor,
        previousParcelStatus: parcel.status,
        newParcelStatus: parcelStatus,
      });
      await appendParcelEvent(tx, {
        parcelId: parcel.id,
        eventType: 'parcel_return.completed',
        actor,
        previousParcelStatus: parcel.status,
        newParcelStatus: parcelStatus,
        payload: { parcelReturnId: current.id, method: 'business_pickup' },
      });
    });

    await this.emitReturnCompleted(current.businessId, parcel.id, current.id);
    return this.requireById(current.id);
  }

  /**
   * Flow 3A: Eveider driver collects the deposited return from the locker.
   * Called from DeliveryRepository.scan for kind=customer_return.
   */
  async collectFromLocker(
    ctx: DataAccessContext,
    delivery: CustomerReturnDeliveryRef,
  ): Promise<void> {
    if (delivery.kind !== 'customer_return') {
      throw new Error('Cette collecte n’est pas un retour client');
    }
    if (
      (delivery.status === 'scanned' || delivery.status === 'completed') &&
      (delivery.parcel.status === 'returning' || delivery.parcel.status === 'returned')
    ) {
      return;
    }
    if (delivery.status !== 'started') {
      throw new Error('La livraison n’est pas prête pour la collecte');
    }

    const current = await this.findActiveForParcel(delivery.parcelId);
    if (!current) throw new Error('Aucun retour client actif pour ce colis');
    if (!canCollectCustomerReturnFromLocker(current.status, current.method)) {
      throw new Error('Le chauffeur Eveider ne peut collecter qu’un retour déposé au casier');
    }
    if (delivery.parcel.status !== 'return_at_point') {
      throw new Error('Le chauffeur Eveider ne peut collecter qu’un retour déposé au casier');
    }

    const actor = resolveEventActor(ctx);
    const deliveryStatus = transitionDelivery(delivery.status, 'scanned', 'customer_return');
    const parcelStatus = transitionParcel(delivery.parcel.status, 'returning');
    const returnStatus = transitionParcelReturn(current.status, 'in_transit');
    const compartmentId = current.compartmentId ?? delivery.parcel.compartmentId;

    await withTransaction(async (tx) => {
      await tx.query(
        `UPDATE deliveries SET status = $1, scanned_at = NOW(), updated_at = NOW() WHERE id = $2`,
        [deliveryStatus, delivery.id],
      );
      if (compartmentId) {
        await tx.query(
          `UPDATE compartments SET status = 'available', updated_at = NOW() WHERE id = $1`,
          [compartmentId],
        );
        await appendParcelEvent(tx, {
          parcelId: delivery.parcelId,
          deliveryId: delivery.id,
          compartmentId,
          eventType: 'compartment.released',
          actor,
          previousParcelStatus: delivery.parcel.status,
          newParcelStatus: parcelStatus,
          payload: { lockerId: current.returnLockerId, kind: 'customer_return' },
        });
      }
      await tx.query(
        `UPDATE parcels SET status = $1, compartment_id = NULL, updated_at = NOW() WHERE id = $2`,
        [parcelStatus, delivery.parcelId],
      );
      await tx.query(
        `UPDATE parcel_returns SET status = $1, updated_at = NOW() WHERE id = $2`,
        [returnStatus, current.id],
      );
      await appendParcelEvent(tx, {
        parcelId: delivery.parcelId,
        deliveryId: delivery.id,
        eventType: 'delivery.scanned',
        actor,
        previousDeliveryStatus: delivery.status,
        newDeliveryStatus: deliveryStatus,
      });
      await appendParcelEvent(tx, {
        parcelId: delivery.parcelId,
        deliveryId: delivery.id,
        eventType: 'parcel.status_changed',
        actor,
        previousParcelStatus: delivery.parcel.status,
        newParcelStatus: parcelStatus,
      });
    });
  }

  /**
   * Flow 3A: Eveider driver delivers the returned parcel to the business.
   * Called from DeliveryRepository.completeDropOff for kind=customer_return.
   * Destination is the business, not a locker — no drop_off_pending / compartment occupy.
   */
  async completeToBusiness(
    ctx: DataAccessContext,
    delivery: CustomerReturnDeliveryRef,
    photoBase64?: string,
  ): Promise<void> {
    if (delivery.kind !== 'customer_return') {
      throw new Error('Cette livraison n’est pas un retour client');
    }
    if (delivery.status === 'completed') return;
    if (delivery.status !== 'scanned') {
      throw new Error('Confirmez la prise en charge avant la remise au marchand');
    }

    const current = await this.findActiveForParcel(delivery.parcelId);
    if (!current) throw new Error('Aucun retour client actif pour ce colis');
    if (!canCompleteEveiderReturnToBusiness(current.status, current.method)) {
      throw new Error('La remise au marchand n’est possible qu’en transit Eveider');
    }
    if (delivery.parcel.status !== 'returning') {
      throw new Error('La remise au marchand n’est possible qu’en transit Eveider');
    }

    const actor = resolveEventActor(ctx);
    const deliveryStatus = transitionDelivery(delivery.status, 'completed', 'customer_return');
    const parcelStatus = transitionParcel(delivery.parcel.status, 'returned');
    const returnStatus = transitionParcelReturn(current.status, 'completed');
    const photo = photoBase64?.trim() ? photoBase64 : null;

    await withTransaction(async (tx) => {
      await tx.query(
        `UPDATE deliveries
         SET status = $1, completed_at = NOW(), drop_off_photo = COALESCE($2, drop_off_photo), updated_at = NOW()
         WHERE id = $3`,
        [deliveryStatus, photo, delivery.id],
      );
      await tx.query(
        `UPDATE parcels SET status = $1, updated_at = NOW() WHERE id = $2`,
        [parcelStatus, delivery.parcelId],
      );
      await tx.query(
        `UPDATE parcel_returns
         SET status = $1, completed_at = NOW(), updated_at = NOW()
         WHERE id = $2`,
        [returnStatus, current.id],
      );
      await appendParcelEvent(tx, {
        parcelId: delivery.parcelId,
        deliveryId: delivery.id,
        eventType: 'delivery.completed',
        actor,
        previousDeliveryStatus: delivery.status,
        newDeliveryStatus: deliveryStatus,
        previousParcelStatus: delivery.parcel.status,
        newParcelStatus: parcelStatus,
        payload: { kind: 'customer_return', hasProof: Boolean(photo) },
      });
      await appendParcelEvent(tx, {
        parcelId: delivery.parcelId,
        deliveryId: delivery.id,
        eventType: 'parcel.status_changed',
        actor,
        previousParcelStatus: delivery.parcel.status,
        newParcelStatus: parcelStatus,
      });
      await appendParcelEvent(tx, {
        parcelId: delivery.parcelId,
        deliveryId: delivery.id,
        eventType: 'parcel_return.completed',
        actor,
        previousParcelStatus: delivery.parcel.status,
        newParcelStatus: parcelStatus,
        payload: { parcelReturnId: current.id, method: 'eveider_return' },
      });
    });

    await this.emitReturnCompleted(current.businessId, delivery.parcelId, current.id);
  }

  private async emitReturnCompleted(
    businessId: string,
    parcelId: string,
    returnId: string,
  ): Promise<void> {
    try {
      const tracking = await this.db.query(
        `SELECT tracking_number FROM parcels WHERE id = $1 LIMIT 1`,
        [parcelId],
      );
      const trackingNumber = tracking.rows[0]
        ? String(tracking.rows[0].tracking_number)
        : parcelId;
      await this.notifications.web.emit({
        type: 'return.completed',
        audience: 'business_web',
        businessId,
        title: 'Retour terminé',
        message: `Le retour de ${trackingNumber} est terminé.`,
        entityType: 'parcel',
        entityId: parcelId,
        parcelId,
        dedupeKey: `return.completed:${returnId}`,
      });
    } catch (error) {
      console.error('[eveider:web-notify] return.completed failed', error);
    }

    try {
      const parcel = await this.loadParcel(parcelId);
      if (!parcel) return;
      const userId = await this.notifications.resolveCustomerUserId(parcel);
      if (!userId) return;
      await this.notifications.notifyCustomerReturnCompleted({
        userId,
        parcelId,
        returnId,
        businessId,
      });
    } catch (error) {
      console.error('[eveider:notify] return.completed (customer) failed', error);
    }
  }

  async assertAssignableCustomerReturn(
    parcelId: string,
  ): Promise<{ parcelStatus: ParcelStatus; lockerId: string }> {
    const parcel = await this.loadParcel(parcelId);
    if (!parcel) throw new Error(`Parcel ${parcelId} not found`);
    const active = await this.findActiveForParcel(parcelId);
    if (!active) {
      throw new Error('Aucun retour client en attente de collecte Eveider');
    }
    if (!canAssignCustomerReturnDelivery(active.status, active.method)) {
      throw new Error('Assignation coursier indisponible pour un retrait marchand');
    }
    if (parcel.status !== 'return_at_point') {
      throw new Error('Le chauffeur Eveider ne peut collecter qu’un retour déposé au casier');
    }
    const lockerId = active.returnLockerId ?? parcel.lockerId;
    if (!lockerId) {
      throw new Error('Le colis doit avoir un casier de destination avant assignation');
    }
    return { parcelStatus: parcel.status, lockerId };
  }

  private assertBusinessOperator(ctx: DataAccessContext): void {
    if (ctx.role === 'admin') {
      throw new AccessDeniedError('Cette action appartient à l’entreprise');
    }
    assertCompanyPermission(ctx, 'manage_operations');
  }

  private selectSql(): string {
    return `SELECT pr.*,
                   CASE WHEN l.id IS NULL THEN NULL
                        ELSE json_build_object('id', l.id, 'name', l.name, 'address', l.address)
                   END AS return_locker_json,
                   c.label AS compartment_label
            FROM parcel_returns pr
            LEFT JOIN lockers l ON l.id = pr.return_locker_id
            LEFT JOIN compartments c ON c.id = pr.compartment_id`;
  }

  private mapRecord(row: Record<string, unknown>): ParcelReturnRecord {
    const lockerJson = row.return_locker_json as
      | { id: string; name: string; address: string }
      | null
      | undefined;
    return {
      ...mapParcelReturn(row),
      returnLocker: lockerJson
        ? {
            id: String(lockerJson.id),
            name: String(lockerJson.name),
            address: String(lockerJson.address),
          }
        : null,
      compartmentLabel: row.compartment_label == null ? null : String(row.compartment_label),
    };
  }

  private async loadById(id: string): Promise<ParcelReturnRecord | null> {
    const result = await this.db.query(`${this.selectSql()} WHERE pr.id = $1 LIMIT 1`, [id]);
    const row = result.rows[0];
    return row ? this.mapRecord(row) : null;
  }

  private async requireById(id: string): Promise<ParcelReturnRecord> {
    const record = await this.loadById(id);
    if (!record) throw new Error('Retour introuvable');
    return record;
  }

  private async loadParcel(id: string): Promise<{
    id: string;
    businessId: string;
    customerId: string | null;
    recipientPhone: string;
    status: ParcelStatus;
    lockerId: string | null;
    compartmentId: string | null;
  } | null> {
    const result = await this.db.query(
      `SELECT id, business_id, customer_id, recipient_phone, status, locker_id, compartment_id
       FROM parcels WHERE id = $1 LIMIT 1`,
      [id],
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
      id: String(row.id),
      businessId: String(row.business_id),
      customerId: row.customer_id == null ? null : String(row.customer_id),
      recipientPhone: String(row.recipient_phone),
      status: row.status as ParcelStatus,
      lockerId: row.locker_id == null ? null : String(row.locker_id),
      compartmentId: row.compartment_id == null ? null : String(row.compartment_id),
    };
  }

  private async loadLocker(id: string): Promise<{
    id: string;
    type: LockerType;
    status: 'active' | 'offline' | 'full' | 'archived';
  } | null> {
    const result = await this.db.query(
      `SELECT id, type, status FROM lockers WHERE id = $1 LIMIT 1`,
      [id],
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
      id: String(row.id),
      type: row.type as LockerType,
      status: row.status as 'active' | 'offline' | 'full' | 'archived',
    };
  }

  private async reserveCompartment(lockerId: string, existingCompartmentId: string | null) {
    if (existingCompartmentId) {
      const result = await this.db.query(
        `SELECT * FROM compartments WHERE id = $1 AND locker_id = $2 LIMIT 1`,
        [existingCompartmentId, lockerId],
      );
      const row = result.rows[0];
      if (!row) throw new Error('Compartiment introuvable pour ce point');
      const compartment = mapCompartment(row);
      if (compartment.status !== 'available' && compartment.status !== 'reserved') {
        throw new Error('Compartiment indisponible');
      }
      return compartment;
    }

    const result = await this.db.query(
      `SELECT * FROM compartments
       WHERE locker_id = $1 AND status = 'available'
       ORDER BY label ASC
       LIMIT 1`,
      [lockerId],
    );
    const row = result.rows[0];
    if (!row) throw new Error('Aucun compartiment disponible au casier');
    return mapCompartment(row);
  }
}

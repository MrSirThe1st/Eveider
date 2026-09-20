import type { LockerActionAuthorizeInput, LockerActionConfirmInput } from '@eveider/api-contracts';
import {
  canAcceptDropOff,
  canCancelLockerActionSession,
  DEFAULT_LOCKER_ACTION_TTL_SECONDS,
  DEFAULT_LOCKER_NETWORK_SETTINGS,
  depositRequiresReservation,
  driverReturnPickupEligible,
  flow1DepositEligible,
  flow2DepositEligible,
  isAssignableDriverDossier,
  isHardwareSmartLocker,
  lockerActionSessionConfirmDenial,
  lockerDenialFromCommercial,
  normalizeTrackingNumber,
  suggestCompartmentForParcelSize,
  recipientCollectionEligible,
  recipientReturnDepositEligible,
  type CompartmentSize,
  type DriverDossierStatus,
  type LockerAction,
  type LockerActionActorType,
  type LockerDenialReason,
  type LockerType,
  type ParcelStatus,
  type ShipmentPickupType,
} from '@eveider/domain';
import { createDataAccessContext, type DataAccessContext } from '../context.js';
import type { Queryable } from '../db/index.js';
import { withTransaction } from '../db/pool.js';
import { mapCompartment, mapLockerActionSession } from '../db/mappers.js';
import type { Compartment, LockerActionSession } from '../db/types.js';
import { phonesMatch } from '../tracking/guest-track.js';
import { CommercialRepository } from './commercial.repository.js';
import { DeliveryRepository } from './delivery.repository.js';
import { LockerSettingsRepository, toLockerNetworkSettings } from './locker-settings.repository.js';
import { appendParcelEvent, resolveEventActor } from './parcel-event.repository.js';
import { ParcelRepository } from './parcel.repository.js';
import { ParcelReturnRepository } from './parcel-return.repository.js';
import { NotificationRepository } from './notification.repository.js';
import { logLockerEvent } from '../locker-api/log.js';
import { LockerAuthorizationError } from '../locker-api/errors.js';

export { LockerAuthorizationError };

const ACTIVE_DELIVERY_STATUSES = ['assigned', 'scanned', 'drop_off_pending'] as const;

export type LockerAuthorizeResult = {
  authorized: true;
  sessionId: string;
  action: LockerAction;
  trackingNumber: string;
  parcelId: string;
  expiresAt: Date;
  compartment: { id: string; label: string; size: string } | null;
};

export type LockerConfirmResult = {
  confirmed: true;
  alreadyConfirmed: boolean;
  sessionId: string;
  action: LockerAction;
  parcelId: string;
};

export type LockerCancelResult = {
  cancelled: true;
  alreadyReleased: boolean;
  sessionId: string;
  status: 'cancelled' | 'expired';
};

export type ExpireLockerSessionsResult = {
  expired: number;
  released: number;
};

export type LockerIntegrityFinding = {
  kind:
    | 'reserved_without_session'
    | 'occupied_without_expected_parcel'
    | 'active_credential_on_collected_parcel'
    | 'confirmed_session_mismatched_parcel';
  lockerId: string | null;
  compartmentId: string | null;
  parcelId: string | null;
  sessionId: string | null;
  credentialId: string | null;
  detail: string;
};

type ParcelLockerRow = {
  id: string;
  trackingNumber: string;
  status: ParcelStatus;
  businessId: string;
  recipientPhone: string;
  lockerId: string | null;
  compartmentId: string | null;
  pickupType: ShipmentPickupType;
  packageSize: CompartmentSize;
  lockerType: LockerType | null;
  lockerStatus: 'active' | 'offline' | 'full' | 'archived' | null;
};

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: string }).code === '23505'
  );
}

function deny(code: LockerDenialReason): never {
  throw new LockerAuthorizationError(code);
}

function ttlSeconds(): number {
  const raw = Number(process.env.EVEIDER_LOCKER_ACTION_TTL_SECONDS);
  if (Number.isFinite(raw) && raw >= 30 && raw <= 3600) return Math.floor(raw);
  return DEFAULT_LOCKER_ACTION_TTL_SECONDS;
}

function systemCtx(): DataAccessContext {
  return createDataAccessContext({ platformRole: 'super_admin' });
}

export class LockerActionRepository {
  private readonly parcels: ParcelRepository;
  private readonly deliveries: DeliveryRepository;
  private readonly parcelReturns: ParcelReturnRepository;
  private readonly commercial: CommercialRepository;
  private readonly lockerSettings: LockerSettingsRepository;

  constructor(private readonly db: Queryable) {
    const notifications = new NotificationRepository(db);
    this.parcels = new ParcelRepository(db, notifications);
    this.deliveries = new DeliveryRepository(db, notifications);
    this.parcelReturns = new ParcelReturnRepository(db);
    this.commercial = new CommercialRepository(db);
    this.lockerSettings = new LockerSettingsRepository(db);
  }

  async authorize(
    lockerId: string,
    input: LockerActionAuthorizeInput,
  ): Promise<LockerAuthorizeResult> {
    const locker = await this.requireHardwareLocker(lockerId);
    const parcel = await this.findParcelByTracking(input.trackingNumber);
    if (!parcel) deny('PARCEL_NOT_FOUND');

    try {
      return await withTransaction(async (tx) => {
        const repo = new LockerActionRepository(tx);
        await repo.expireAuthorizedSessions({ parcelId: parcel.id, lockerId });
        const prepared = await repo.prepareAuthorization(locker, parcel, input);
        await repo.assertNoActiveSession(parcel.id, prepared.compartmentId);
        const session = await repo.insertSession({
          action: input.action,
          parcelId: parcel.id,
          lockerId,
          compartmentId: prepared.compartmentId,
          actorType: input.actorType,
          actorReference: prepared.actorReference,
        });
        if (prepared.compartment && input.action === 'deposit') {
          await appendParcelEvent(tx, {
            parcelId: parcel.id,
            compartmentId: prepared.compartment.id,
            eventType: 'compartment.reserved',
            actor: resolveEventActor(systemCtx()),
            payload: {
              lockerId,
              sessionId: session.id,
              action: input.action,
            },
          });
        }
        logLockerEvent('action_authorized', {
          lockerId,
          sessionId: session.id,
          action: session.action,
          parcelId: parcel.id,
          compartmentId: prepared.compartmentId,
        });
        return {
          authorized: true as const,
          sessionId: session.id,
          action: session.action,
          trackingNumber: parcel.trackingNumber,
          parcelId: parcel.id,
          expiresAt: session.expiresAt,
          compartment: prepared.compartment,
        };
      });
    } catch (err) {
      if (err instanceof LockerAuthorizationError) throw err;
      if (isUniqueViolation(err)) deny('SESSION_CONFLICT');
      throw err;
    }
  }

  async confirm(
    lockerId: string,
    sessionId: string,
    input: LockerActionConfirmInput,
  ): Promise<LockerConfirmResult> {
    const session = await this.loadSession(sessionId);
    if (!session) deny('SESSION_NOT_FOUND');

    await this.expireAuthorizedSessions({
      parcelId: session.parcelId,
      lockerId: session.lockerId,
      compartmentId: session.compartmentId,
    });
    const current = (await this.loadSession(sessionId)) ?? session;

    if (current.status === 'confirmed') {
      if (
        input.deviceEventId &&
        current.deviceEventId &&
        input.deviceEventId !== current.deviceEventId
      ) {
        deny('SESSION_MISMATCH');
      }
      return {
        confirmed: true,
        alreadyConfirmed: true,
        sessionId: current.id,
        action: current.action,
        parcelId: current.parcelId,
      };
    }

    // SQL expiry is authoritative. TIMESTAMP WITHOUT TIME ZONE mapped into a JS
    // Date is not timezone-safe, so do not re-check the clock in-process.
    const mismatch = lockerActionSessionConfirmDenial(current, { lockerId }, new Date(0));
    if (mismatch) deny(mismatch);

    const ctx = systemCtx();
    await this.applyConfirmation(ctx, current);

    try {
      await this.db.query(
        `UPDATE locker_action_sessions
         SET status = 'confirmed',
             confirmed_at = NOW(),
             device_event_id = COALESCE($2, device_event_id),
             updated_at = NOW()
         WHERE id = $1 AND status = 'authorized'`,
        [current.id, input.deviceEventId ?? null],
      );
    } catch (err) {
      if (isUniqueViolation(err)) deny('SESSION_MISMATCH');
      throw err;
    }

    logLockerEvent('action_confirmed', {
      lockerId,
      sessionId: current.id,
      action: current.action,
      parcelId: current.parcelId,
      alreadyConfirmed: false,
      deviceEventId: input.deviceEventId,
    });

    return {
      confirmed: true,
      alreadyConfirmed: false,
      sessionId: current.id,
      action: current.action,
      parcelId: current.parcelId,
    };
  }

  /**
   * Periodic / maintenance expiry. Transactional, SKIP LOCKED, never releases
   * occupied compartments or live reservations owned by another session.
   */
  async expireLockerActionSessions(lockerId?: string | null): Promise<ExpireLockerSessionsResult> {
    return withTransaction(async (tx) => {
      const repo = new LockerActionRepository(tx);
      return repo.expireAuthorizedSessions({ lockerId: lockerId ?? null });
    });
  }

  async inspectLockerIntegrity(lockerId?: string | null): Promise<LockerIntegrityFinding[]> {
    const findings: LockerIntegrityFinding[] = [];
    const reserved = await this.db.query(
      `SELECT c.id, c.locker_id
       FROM compartments c
       WHERE c.status = 'reserved'
         AND ($1::uuid IS NULL OR c.locker_id = $1)
         AND NOT EXISTS (
           SELECT 1 FROM locker_action_sessions s
           WHERE s.compartment_id = c.id
             AND s.status = 'authorized'
             AND s.expires_at > NOW()
         )`,
      [lockerId ?? null],
    );
    for (const row of reserved.rows) {
      findings.push({
        kind: 'reserved_without_session',
        lockerId: String(row.locker_id),
        compartmentId: String(row.id),
        parcelId: null,
        sessionId: null,
        credentialId: null,
        detail: 'Compartment is reserved with no live authorized session',
      });
    }

    const occupied = await this.db.query(
      `SELECT c.id, c.locker_id, p.id AS parcel_id, p.status AS parcel_status
       FROM compartments c
       LEFT JOIN parcels p ON p.compartment_id = c.id
       WHERE c.status = 'occupied'
         AND ($1::uuid IS NULL OR c.locker_id = $1)
         AND (
           p.id IS NULL
           OR p.status NOT IN ('delivered_to_locker', 'ready_for_pickup', 'return_at_point')
           OR p.locker_id IS DISTINCT FROM c.locker_id
         )`,
      [lockerId ?? null],
    );
    for (const row of occupied.rows) {
      findings.push({
        kind: 'occupied_without_expected_parcel',
        lockerId: String(row.locker_id),
        compartmentId: String(row.id),
        parcelId: row.parcel_id == null ? null : String(row.parcel_id),
        sessionId: null,
        credentialId: null,
        detail: `Occupied compartment parcel status=${row.parcel_status ?? 'missing'}`,
      });
    }

    const credentials = await this.db.query(
      `SELECT c.id, c.parcel_id, c.locker_id, p.status AS parcel_status
       FROM locker_collection_credentials c
       JOIN parcels p ON p.id = c.parcel_id
       WHERE c.status = 'active'
         AND ($1::uuid IS NULL OR c.locker_id = $1)
         AND p.status = 'collected'`,
      [lockerId ?? null],
    );
    for (const row of credentials.rows) {
      findings.push({
        kind: 'active_credential_on_collected_parcel',
        lockerId: String(row.locker_id),
        compartmentId: null,
        parcelId: String(row.parcel_id),
        sessionId: null,
        credentialId: String(row.id),
        detail: 'Active collection credential on a collected parcel',
      });
    }

    const mismatched = await this.db.query(
      `SELECT s.id, s.parcel_id, s.locker_id, s.compartment_id, p.status AS parcel_status, s.action
       FROM locker_action_sessions s
       JOIN parcels p ON p.id = s.parcel_id
       WHERE s.status = 'confirmed'
         AND ($1::uuid IS NULL OR s.locker_id = $1)
         AND (
           (s.action = 'deposit' AND p.status NOT IN ('delivered_to_locker', 'ready_for_pickup', 'return_at_point', 'collected', 'returning', 'returned'))
           OR (s.action = 'recipient_collection' AND p.status NOT IN ('collected', 'return_at_point', 'returning', 'returned'))
           OR (s.action = 'driver_pickup' AND p.status NOT IN ('returning', 'returned'))
           OR (s.action = 'business_return_pickup' AND p.status <> 'returned')
         )`,
      [lockerId ?? null],
    );
    for (const row of mismatched.rows) {
      findings.push({
        kind: 'confirmed_session_mismatched_parcel',
        lockerId: String(row.locker_id),
        compartmentId: row.compartment_id == null ? null : String(row.compartment_id),
        parcelId: String(row.parcel_id),
        sessionId: String(row.id),
        credentialId: null,
        detail: `Confirmed ${row.action} session vs parcel status ${row.parcel_status}`,
      });
    }

    return findings;
  }

  async cancel(lockerId: string, sessionId: string): Promise<LockerCancelResult> {
    const session = await this.loadSession(sessionId);
    if (!session) deny('SESSION_NOT_FOUND');
    if (session.lockerId !== lockerId) deny('WRONG_LOCKER');

    await this.expireAuthorizedSessions({
      parcelId: session.parcelId,
      lockerId: session.lockerId,
      compartmentId: session.compartmentId,
    });
    const current = (await this.loadSession(sessionId)) ?? session;

    if (current.status === 'confirmed') deny('SESSION_MISMATCH');
    if (current.status === 'cancelled' || current.status === 'expired') {
      return {
        cancelled: true,
        alreadyReleased: true,
        sessionId: current.id,
        status: current.status,
      };
    }
    if (!canCancelLockerActionSession(current.status)) deny('SESSION_MISMATCH');

    await withTransaction(async (tx) => {
      await tx.query(
        `UPDATE locker_action_sessions
         SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
         WHERE id = $1 AND status = 'authorized'`,
        [current.id],
      );
      await this.releaseReservation(tx, current);
    });

    return {
      cancelled: true,
      alreadyReleased: false,
      sessionId: current.id,
      status: 'cancelled',
    };
  }

  private async prepareAuthorization(
    locker: { id: string; type: LockerType; status: 'active' | 'offline' | 'full' | 'archived' },
    parcel: ParcelLockerRow,
    input: LockerActionAuthorizeInput,
  ): Promise<{
    actorReference: string;
    compartmentId: string | null;
    compartment: { id: string; label: string; size: string } | null;
  }> {
    if (input.action === 'deposit' && input.actorType === 'eveider_driver') {
      return this.prepareFlow1Deposit(locker, parcel, input.driverId);
    }
    if (input.action === 'deposit' && input.actorType === 'business_representative') {
      return this.prepareFlow2Deposit(locker, parcel, input.businessPhone);
    }
    if (input.action === 'deposit' && input.actorType === 'recipient') {
      return this.prepareReturnDeposit(locker, parcel, input.phone, input.returnCode);
    }
    if (input.action === 'driver_pickup') {
      return this.prepareDriverPickup(locker, parcel, input.driverId);
    }
    if (input.action === 'recipient_collection') {
      return this.prepareRecipientCollection(locker, parcel, input.phone, input.pickupPin);
    }
    return this.prepareBusinessReturnPickup(locker, parcel, input.businessPhone);
  }

  private async prepareFlow1Deposit(
    locker: { id: string; type: LockerType; status: 'active' | 'offline' | 'full' | 'archived' },
    parcel: ParcelLockerRow,
    driverId: string,
  ) {
    if (!isHardwareSmartLocker(locker.type) || !isHardwareSmartLocker(parcel.lockerType)) {
      deny('LOCKER_TYPE_NOT_SUPPORTED');
    }
    if (parcel.lockerId !== locker.id) deny('WRONG_LOCKER');
    if (!flow1DepositEligible({
      pickupType: parcel.pickupType,
      parcelStatus: parcel.status,
      lockerType: locker.type,
    })) {
      deny('INVALID_PARCEL_STATE');
    }
    if (!canAcceptDropOff(locker.status)) deny('LOCKER_UNAVAILABLE');
    const driver = await this.requireEveiderDriver(driverId);
    const delivery = await this.findActiveDelivery(parcel.id, 'outbound');
    if (!delivery || delivery.driverId !== driver.userId) deny('DRIVER_NOT_ASSIGNED');
    const compartment = await this.reserveCompatibleCompartment(locker.id, parcel.packageSize);
    return {
      actorReference: driver.userId,
      compartmentId: compartment.id,
      compartment: { id: compartment.id, label: compartment.label, size: compartment.size },
    };
  }

  private async prepareFlow2Deposit(
    locker: { id: string; type: LockerType; status: 'active' | 'offline' | 'full' | 'archived' },
    parcel: ParcelLockerRow,
    businessPhone: string,
  ) {
    if (!isHardwareSmartLocker(locker.type)) deny('LOCKER_TYPE_NOT_SUPPORTED');
    if (parcel.lockerId !== locker.id) deny('WRONG_LOCKER');
    if (!flow2DepositEligible({
      pickupType: parcel.pickupType,
      parcelStatus: parcel.status,
      lockerType: locker.type,
    })) {
      deny('INVALID_PARCEL_STATE');
    }
    if (!canAcceptDropOff(locker.status)) deny('LOCKER_UNAVAILABLE');
    await this.requireBusinessPhone(parcel.businessId, businessPhone);
    const delivery = await this.findActiveDelivery(parcel.id, 'outbound');
    if (delivery) deny('INVALID_PARCEL_STATE');
    const compartment = await this.reserveCompatibleCompartment(locker.id, parcel.packageSize);
    return {
      actorReference: this.normalizedActorPhone(businessPhone),
      compartmentId: compartment.id,
      compartment: { id: compartment.id, label: compartment.label, size: compartment.size },
    };
  }

  private async prepareReturnDeposit(
    locker: { id: string; type: LockerType; status: 'active' | 'offline' | 'full' | 'archived' },
    parcel: ParcelLockerRow,
    phone: string,
    returnCode: string,
  ) {
    if (!isHardwareSmartLocker(locker.type)) deny('LOCKER_TYPE_NOT_SUPPORTED');
    if (!phonesMatch(parcel.recipientPhone, phone)) deny('INVALID_CREDENTIALS');
    const activeReturn = await this.parcelReturns.findActiveForParcel(parcel.id);
    if (!activeReturn) deny('RETURN_NOT_AUTHORIZED');
    if (!recipientReturnDepositEligible({
      parcelStatus: parcel.status,
      returnStatus: activeReturn.status,
      lockerType: locker.type,
    })) {
      if (activeReturn.status !== 'authorized') deny('RETURN_NOT_AUTHORIZED');
      deny('INVALID_PARCEL_STATE');
    }
    if (!activeReturn.returnLockerId || activeReturn.returnLockerId !== locker.id) {
      deny('WRONG_LOCKER');
    }
    if (!canAcceptDropOff(locker.status)) deny('LOCKER_UNAVAILABLE');
    if (!activeReturn.returnCode || activeReturn.returnCode !== returnCode.trim()) {
      deny('INVALID_CREDENTIALS');
    }
    const compartment = await this.reserveCompatibleCompartment(locker.id, parcel.packageSize);
    return {
      actorReference: this.normalizedActorPhone(phone),
      compartmentId: compartment.id,
      compartment: { id: compartment.id, label: compartment.label, size: compartment.size },
    };
  }

  private async prepareDriverPickup(
    locker: { id: string; type: LockerType; status: 'active' | 'offline' | 'full' | 'archived' },
    parcel: ParcelLockerRow,
    driverId: string,
  ) {
    if (!isHardwareSmartLocker(locker.type)) deny('LOCKER_TYPE_NOT_SUPPORTED');
    const activeReturn = await this.parcelReturns.findActiveForParcel(parcel.id);
    if (!activeReturn) deny('RETURN_NOT_AUTHORIZED');
    if (activeReturn.method === 'business_pickup') deny('WRONG_RETURN_METHOD');
    if (!driverReturnPickupEligible({
      parcelStatus: parcel.status,
      returnStatus: activeReturn.status,
      returnMethod: activeReturn.method,
    })) {
      deny('INVALID_PARCEL_STATE');
    }
    if (!activeReturn.returnLockerId || activeReturn.returnLockerId !== locker.id) {
      deny('WRONG_LOCKER');
    }
    const driver = await this.requireEveiderDriver(driverId);
    const delivery = await this.findActiveDelivery(parcel.id, 'customer_return');
    if (!delivery || delivery.driverId !== driver.userId) deny('DRIVER_NOT_ASSIGNED');
    const rts = await this.findActiveDelivery(parcel.id, 'return');
    if (rts) deny('INVALID_PARCEL_STATE');
    const compartment = await this.requireOccupiedCompartment(locker.id, parcel.compartmentId);
    return {
      actorReference: driver.userId,
      compartmentId: compartment.id,
      compartment: { id: compartment.id, label: compartment.label, size: compartment.size },
    };
  }

  private async prepareRecipientCollection(
    locker: { id: string; type: LockerType; status: 'active' | 'offline' | 'full' | 'archived' },
    parcel: ParcelLockerRow,
    phone: string,
    pickupPin: string,
  ) {
    if (!isHardwareSmartLocker(locker.type)) deny('LOCKER_TYPE_NOT_SUPPORTED');
    if (parcel.lockerId !== locker.id) deny('WRONG_LOCKER');
    if (!recipientCollectionEligible(parcel.status)) deny('INVALID_PARCEL_STATE');
    if (!phonesMatch(parcel.recipientPhone, phone)) deny('INVALID_CREDENTIALS');
    const pin = await this.loadPickupPin(parcel.id);
    if (!pin || pin !== pickupPin.trim()) deny('INVALID_CREDENTIALS');
    const decision = await this.commercial.evaluateRecipientCollection(parcel.id);
    const commercialDenial = lockerDenialFromCommercial(decision.code);
    if (commercialDenial) deny(commercialDenial);
    const compartment = await this.requireOccupiedCompartment(locker.id, parcel.compartmentId);
    return {
      actorReference: this.normalizedActorPhone(phone),
      compartmentId: compartment.id,
      compartment: { id: compartment.id, label: compartment.label, size: compartment.size },
    };
  }

  private async prepareBusinessReturnPickup(
    locker: { id: string; type: LockerType; status: 'active' | 'offline' | 'full' | 'archived' },
    parcel: ParcelLockerRow,
    businessPhone: string,
  ) {
    if (!isHardwareSmartLocker(locker.type)) deny('LOCKER_TYPE_NOT_SUPPORTED');
    await this.requireBusinessPhone(parcel.businessId, businessPhone);
    const activeReturn = await this.parcelReturns.findActiveForParcel(parcel.id);
    if (!activeReturn) deny('RETURN_NOT_AUTHORIZED');
    if (activeReturn.method === 'eveider_return') deny('WRONG_RETURN_METHOD');
    if (
      parcel.status !== 'return_at_point' ||
      activeReturn.status !== 'awaiting_pickup' ||
      activeReturn.method !== 'business_pickup'
    ) {
      deny('INVALID_PARCEL_STATE');
    }
    if (!activeReturn.returnLockerId || activeReturn.returnLockerId !== locker.id) {
      deny('WRONG_LOCKER');
    }
    const delivery = await this.findActiveDelivery(parcel.id, 'customer_return');
    if (delivery) deny('INVALID_PARCEL_STATE');
    const compartment = await this.requireOccupiedCompartment(
      locker.id,
      activeReturn.compartmentId ?? parcel.compartmentId,
    );
    return {
      actorReference: this.normalizedActorPhone(businessPhone),
      compartmentId: compartment.id,
      compartment: { id: compartment.id, label: compartment.label, size: compartment.size },
    };
  }

  private async applyConfirmation(ctx: DataAccessContext, session: LockerActionSession): Promise<void> {
    if (session.action === 'deposit' && session.actorType === 'eveider_driver') {
      const delivery = await this.findActiveDelivery(session.parcelId, 'outbound');
      if (!delivery) {
        const completed = await this.findCompletedOutbound(session.parcelId);
        if (completed) return;
        deny('DRIVER_NOT_ASSIGNED');
      }
      await this.deliveries.confirmLockerOutboundDeposit(ctx, {
        deliveryId: delivery.id,
        compartmentId: session.compartmentId ?? '',
      });
      return;
    }
    if (session.action === 'deposit' && session.actorType === 'business_representative') {
      await this.parcels.confirmMerchantDeposit(ctx, session.parcelId, session.compartmentId ?? undefined);
      return;
    }
    if (session.action === 'deposit' && session.actorType === 'recipient') {
      const parcel = await this.loadParcelLite(session.parcelId);
      const current = await this.parcelReturns.findActiveForParcel(session.parcelId);
      if (!parcel || !current || !session.compartmentId) deny('INVALID_PARCEL_STATE');
      const compartment = await this.requireReservedOrOccupied(
        session.lockerId,
        session.compartmentId,
      );
      await this.parcelReturns.applyRecipientReturnDeposit(ctx, {
        parcel,
        current,
        lockerId: session.lockerId,
        compartment,
      });
      return;
    }
    if (session.action === 'driver_pickup') {
      const delivery = await this.findActiveDelivery(session.parcelId, 'customer_return');
      const parcel = await this.loadParcelLite(session.parcelId);
      if (!parcel) deny('PARCEL_NOT_FOUND');
      if (!delivery) {
        if (parcel.status === 'returning' || parcel.status === 'returned') return;
        deny('DRIVER_NOT_ASSIGNED');
      }
      await this.parcelReturns.collectFromLocker(ctx, {
        id: delivery.id,
        parcelId: session.parcelId,
        status: delivery.status,
        kind: 'customer_return',
        parcel: {
          status: parcel.status,
          compartmentId: parcel.compartmentId,
          lockerId: parcel.lockerId,
        },
      });
      return;
    }
    if (session.action === 'recipient_collection') {
      await this.parcels.collectParcel(ctx, session.parcelId);
      return;
    }
    await this.parcelReturns.confirmBusinessPickup(ctx, session.parcelId);
  }

  private async requireHardwareLocker(lockerId: string) {
    const result = await this.db.query(
      `SELECT id, type, status FROM lockers WHERE id = $1 LIMIT 1`,
      [lockerId],
    );
    const row = result.rows[0];
    if (!row) deny('WRONG_LOCKER');
    const locker = {
      id: String(row.id),
      type: row.type as LockerType,
      status: row.status as 'active' | 'offline' | 'full' | 'archived',
    };
    if (!isHardwareSmartLocker(locker.type)) deny('LOCKER_TYPE_NOT_SUPPORTED');
    return locker;
  }

  private async findParcelByTracking(trackingNumber: string): Promise<ParcelLockerRow | null> {
    const tracking = normalizeTrackingNumber(trackingNumber);
    const result = await this.db.query(
      `SELECT p.id, p.tracking_number, p.status, p.business_id, p.recipient_phone,
              p.locker_id, p.compartment_id, p.pickup_type, p.package_size,
              l.type AS locker_type, l.status AS locker_status
       FROM parcels p
       LEFT JOIN lockers l ON l.id = p.locker_id
       WHERE upper(p.tracking_number) = $1
       LIMIT 1`,
      [tracking],
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
      id: String(row.id),
      trackingNumber: String(row.tracking_number),
      status: row.status as ParcelStatus,
      businessId: String(row.business_id),
      recipientPhone: String(row.recipient_phone),
      lockerId: row.locker_id == null ? null : String(row.locker_id),
      compartmentId: row.compartment_id == null ? null : String(row.compartment_id),
      pickupType: (row.pickup_type as ShipmentPickupType) ?? 'merchant_dropoff',
      packageSize: (row.package_size as CompartmentSize) ?? 'medium',
      lockerType: row.locker_type == null ? null : (row.locker_type as LockerType),
      lockerStatus:
        row.locker_status == null
          ? null
          : (row.locker_status as ParcelLockerRow['lockerStatus']),
    };
  }

  private async loadParcelLite(parcelId: string) {
    const result = await this.db.query(
      `SELECT id, status, locker_id, compartment_id FROM parcels WHERE id = $1 LIMIT 1`,
      [parcelId],
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
      id: String(row.id),
      status: row.status as ParcelStatus,
      lockerId: row.locker_id == null ? null : String(row.locker_id),
      compartmentId: row.compartment_id == null ? null : String(row.compartment_id),
    };
  }

  private async requireEveiderDriver(driverId: string): Promise<{ userId: string }> {
    const result = await this.db.query(
      `SELECT d.user_id, d.contractor_type, d.status,
              u.is_blocked, u.deactivated_at, u.deleted_at
       FROM driver_dossiers d
       LEFT JOIN users u ON u.id = d.user_id
       WHERE d.user_id = $1 OR d.id = $1
       ORDER BY d.created_at DESC
       LIMIT 1`,
      [driverId],
    );
    const row = result.rows[0];
    if (!row || row.user_id == null) deny('INVALID_CREDENTIALS');
    if (row.contractor_type === 'business') deny('NOT_EVEIDER_DRIVER');
    if (row.is_blocked || row.deactivated_at || row.deleted_at) deny('NOT_EVEIDER_DRIVER');
    if (
      !isAssignableDriverDossier(
        row.status as DriverDossierStatus,
        row.contractor_type === 'business' ? 'business' : 'eveider',
      )
    ) {
      deny('NOT_EVEIDER_DRIVER');
    }
    return { userId: String(row.user_id) };
  }

  private async requireBusinessPhone(businessId: string, phone: string): Promise<void> {
    const result = await this.db.query(
      `SELECT contact_phone, is_phone_verified FROM businesses WHERE id = $1 LIMIT 1`,
      [businessId],
    );
    const row = result.rows[0];
    if (!row || !row.is_phone_verified || !row.contact_phone) deny('INVALID_CREDENTIALS');
    if (!phonesMatch(String(row.contact_phone), phone)) deny('INVALID_CREDENTIALS');
  }

  private async findActiveDelivery(
    parcelId: string,
    kind: 'outbound' | 'customer_return' | 'return',
  ): Promise<{ id: string; driverId: string; status: 'assigned' | 'scanned' | 'drop_off_pending' } | null> {
    const result = await this.db.query(
      `SELECT id, driver_id, status FROM deliveries
       WHERE parcel_id = $1 AND kind = $2 AND status = ANY($3)
       ORDER BY created_at DESC
       LIMIT 1`,
      [parcelId, kind, ACTIVE_DELIVERY_STATUSES],
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
      id: String(row.id),
      driverId: String(row.driver_id),
      status: row.status as 'assigned' | 'scanned' | 'drop_off_pending',
    };
  }

  private async findCompletedOutbound(parcelId: string): Promise<boolean> {
    const result = await this.db.query(
      `SELECT id FROM deliveries
       WHERE parcel_id = $1 AND kind = 'outbound' AND status = 'completed'
       LIMIT 1`,
      [parcelId],
    );
    return Boolean(result.rows[0]);
  }

  private async loadPickupPin(parcelId: string): Promise<string | null> {
    const result = await this.db.query(
      `SELECT code FROM pickup_pins WHERE parcel_id = $1 LIMIT 1`,
      [parcelId],
    );
    const row = result.rows[0];
    return row?.code == null ? null : String(row.code);
  }

  private async reserveCompatibleCompartment(
    lockerId: string,
    parcelSize: CompartmentSize,
  ): Promise<Compartment> {
    let settings = DEFAULT_LOCKER_NETWORK_SETTINGS;
    try {
      const row = await this.lockerSettings.getNetworkSettings();
      settings = toLockerNetworkSettings(row);
    } catch {
      settings = DEFAULT_LOCKER_NETWORK_SETTINGS;
    }

    const available = await this.db.query(
      `SELECT * FROM compartments WHERE locker_id = $1 AND status = 'available'`,
      [lockerId],
    );
    const compartments = available.rows.map(mapCompartment);
    const picked = suggestCompartmentForParcelSize(
      compartments.map((compartment) => ({
        id: compartment.id,
        label: compartment.label,
        size: compartment.size,
      })),
      parcelSize,
      settings,
    );
    if (!picked) deny('NO_COMPARTMENT_AVAILABLE');

    const orderedIds = [
      picked.id,
      ...compartments
        .filter((compartment) => compartment.id !== picked.id)
        .sort((a, b) => a.label.localeCompare(b.label))
        .map((compartment) => compartment.id),
    ];

    const reserved = await this.db.query(
      `WITH candidate AS (
         SELECT c.id
         FROM compartments c
         WHERE c.locker_id = $1
           AND c.status = 'available'
           AND c.id = ANY($2::uuid[])
         ORDER BY array_position($2::uuid[], c.id)
         FOR UPDATE SKIP LOCKED
         LIMIT 1
       )
       UPDATE compartments SET status = 'reserved', updated_at = NOW()
       FROM candidate
       WHERE compartments.id = candidate.id
       RETURNING compartments.*`,
      [lockerId, orderedIds],
    );
    const row = reserved.rows[0];
    if (!row) deny('NO_COMPARTMENT_AVAILABLE');
    return mapCompartment(row);
  }

  private async requireOccupiedCompartment(
    lockerId: string,
    compartmentId: string | null,
  ): Promise<Compartment> {
    if (!compartmentId) deny('INVALID_PARCEL_STATE');
    const result = await this.db.query(
      `SELECT * FROM compartments WHERE id = $1 AND locker_id = $2 LIMIT 1`,
      [compartmentId, lockerId],
    );
    const row = result.rows[0];
    if (!row) deny('WRONG_LOCKER');
    const compartment = mapCompartment(row);
    if (compartment.status !== 'occupied') deny('INVALID_PARCEL_STATE');
    return compartment;
  }

  private async requireReservedOrOccupied(lockerId: string, compartmentId: string) {
    const result = await this.db.query(
      `SELECT * FROM compartments WHERE id = $1 AND locker_id = $2 LIMIT 1`,
      [compartmentId, lockerId],
    );
    const row = result.rows[0];
    if (!row) deny('WRONG_LOCKER');
    const compartment = mapCompartment(row);
    if (compartment.status !== 'reserved' && compartment.status !== 'occupied') {
      deny('INVALID_PARCEL_STATE');
    }
    return { id: compartment.id, label: compartment.label };
  }

  private async assertNoActiveSession(parcelId: string, compartmentId: string | null): Promise<void> {
    const result = await this.db.query(
      `SELECT id FROM locker_action_sessions
       WHERE status = 'authorized'
         AND (parcel_id = $1 OR ($2::uuid IS NOT NULL AND compartment_id = $2))
       LIMIT 1`,
      [parcelId, compartmentId],
    );
    if (result.rows[0]) deny('SESSION_CONFLICT');
  }

  private async insertSession(input: {
    action: LockerAction;
    parcelId: string;
    lockerId: string;
    compartmentId: string | null;
    actorType: LockerActionActorType;
    actorReference: string;
  }): Promise<LockerActionSession> {
    const result = await this.db.query(
      `INSERT INTO locker_action_sessions (
         action, parcel_id, locker_id, compartment_id,
         actor_type, actor_reference, status, expires_at
       ) VALUES ($1, $2, $3, $4, $5, $6, 'authorized', NOW() + ($7::int * INTERVAL '1 second'))
       RETURNING *`,
      [
        input.action,
        input.parcelId,
        input.lockerId,
        input.compartmentId,
        input.actorType,
        input.actorReference,
        ttlSeconds(),
      ],
    );
    return mapLockerActionSession(result.rows[0]!);
  }

  private async loadSession(id: string): Promise<LockerActionSession | null> {
    const result = await this.db.query(
      `SELECT * FROM locker_action_sessions WHERE id = $1 LIMIT 1`,
      [id],
    );
    const row = result.rows[0];
    return row ? mapLockerActionSession(row) : null;
  }

  /**
   * Expire authorized sessions whose TTL has elapsed and release only those
   * deposit reservations that are still reserved and not owned by another live session.
   */
  async expireAuthorizedSessions(scope: {
    parcelId?: string | null;
    lockerId?: string | null;
    compartmentId?: string | null;
  } = {}): Promise<ExpireLockerSessionsResult> {
    const result = await this.db.query(
      `WITH claimed AS (
         SELECT id
         FROM locker_action_sessions
         WHERE status = 'authorized'
           AND expires_at <= NOW()
           AND (
             ($1::uuid IS NULL AND $2::uuid IS NULL AND $3::uuid IS NULL)
             OR ($1::uuid IS NOT NULL AND parcel_id = $1)
             OR ($2::uuid IS NOT NULL AND locker_id = $2)
             OR ($3::uuid IS NOT NULL AND compartment_id = $3)
           )
         ORDER BY expires_at ASC
         FOR UPDATE SKIP LOCKED
       ),
       expired AS (
         UPDATE locker_action_sessions s
         SET status = 'expired', updated_at = NOW()
         FROM claimed
         WHERE s.id = claimed.id
         RETURNING s.id, s.action, s.compartment_id
       ),
       released AS (
         UPDATE compartments c
         SET status = 'available', updated_at = NOW()
         FROM expired e
         WHERE c.id = e.compartment_id
           AND e.action = 'deposit'
           AND c.status = 'reserved'
           AND NOT EXISTS (
             SELECT 1 FROM locker_action_sessions live
             WHERE live.compartment_id = c.id
               AND live.status = 'authorized'
               AND live.expires_at > NOW()
               AND live.id <> e.id
           )
         RETURNING c.id
       )
       SELECT
         (SELECT COUNT(*)::int FROM expired) AS expired,
         (SELECT COUNT(*)::int FROM released) AS released`,
      [scope.parcelId ?? null, scope.lockerId ?? null, scope.compartmentId ?? null],
    );
    const row = result.rows[0] as { expired: number; released: number } | undefined;
    const expired = Number(row?.expired ?? 0);
    const released = Number(row?.released ?? 0);
    if (expired > 0) {
      logLockerEvent('sessions_expired', {
        lockerId: scope.lockerId ?? undefined,
        expired,
        released,
      });
    }
    return { expired, released };
  }

  private async releaseReservation(
    db: Queryable,
    session: { action: LockerAction; compartmentId: string | null },
  ): Promise<void> {
    if (!depositRequiresReservation(session.action) || !session.compartmentId) return;
    await db.query(
      `UPDATE compartments SET status = 'available', updated_at = NOW()
       WHERE id = $1 AND status = 'reserved'`,
      [session.compartmentId],
    );
  }

  private normalizedActorPhone(phone: string): string {
    return phone.replace(/\D/g, '').slice(-12);
  }
}

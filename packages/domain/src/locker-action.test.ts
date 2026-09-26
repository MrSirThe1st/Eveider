import { describe, expect, it } from 'vitest';
import { lockerDenialFromCommercial } from './locker-action.js';
import {
  canCancelLockerActionSession,
  canCompleteOutboundDeliveryFromLocker,
  completeOutboundDeliveryFromLocker,
  driverReturnPickupEligible,
  flow1DepositEligible,
  flow2DepositEligible,
  lockerActionSessionConfirmDenial,
  lockerActionSessionIsActive,
  pickDepositCompartment,
  recipientCollectionEligible,
  recipientReturnDepositEligible,
} from './locker-action.js';

describe('locker action session', () => {
  const expiresAt = new Date('2026-09-17T12:03:00.000Z');
  const now = new Date('2026-09-17T12:01:00.000Z');

  it('treats authorized unexpired sessions as active', () => {
    expect(lockerActionSessionIsActive('authorized', expiresAt, now)).toBe(true);
    expect(lockerActionSessionIsActive('authorized', expiresAt, new Date('2026-09-17T12:04:00.000Z'))).toBe(
      false,
    );
    expect(lockerActionSessionIsActive('confirmed', expiresAt, now)).toBe(false);
  });

  it('rejects confirm for expired, cancelled, or mismatched bindings', () => {
    const session = {
      status: 'authorized' as const,
      expiresAt,
      action: 'deposit' as const,
      parcelId: 'parcel-1',
      lockerId: 'locker-1',
      compartmentId: 'comp-1',
    };
    expect(
      lockerActionSessionConfirmDenial(session, { lockerId: 'locker-1' }, now),
    ).toBeNull();
    expect(
      lockerActionSessionConfirmDenial(session, { lockerId: 'locker-2' }, now),
    ).toBe('WRONG_LOCKER');
    expect(
      lockerActionSessionConfirmDenial(
        { ...session, status: 'cancelled' },
        { lockerId: 'locker-1' },
        now,
      ),
    ).toBe('SESSION_CANCELLED');
    expect(
      lockerActionSessionConfirmDenial(session, { lockerId: 'locker-1' }, new Date('2026-09-17T12:04:00.000Z')),
    ).toBe('SESSION_EXPIRED');
    expect(
      lockerActionSessionConfirmDenial(
        session,
        { lockerId: 'locker-1', action: 'recipient_collection' },
        now,
      ),
    ).toBe('SESSION_MISMATCH');
  });

  it('allows cancel only while authorized', () => {
    expect(canCancelLockerActionSession('authorized')).toBe(true);
    expect(canCancelLockerActionSession('confirmed')).toBe(false);
    expect(canCancelLockerActionSession('cancelled')).toBe(false);
  });
});

describe('locker eligibility', () => {
  it('authorizes Flow 1 only for courier_pickup + in_transit + SMART_LOCKER', () => {
    expect(
      flow1DepositEligible({
        pickupType: 'courier_pickup',
        parcelStatus: 'in_transit',
        lockerType: 'SMART_LOCKER',
      }),
    ).toBe(true);
    expect(
      flow1DepositEligible({
        pickupType: 'merchant_dropoff',
        parcelStatus: 'in_transit',
        lockerType: 'SMART_LOCKER',
      }),
    ).toBe(false);
    expect(
      flow1DepositEligible({
        pickupType: 'courier_pickup',
        parcelStatus: 'created',
        lockerType: 'SMART_LOCKER',
      }),
    ).toBe(false);
  });

  it('authorizes Flow 2 only for merchant_dropoff + created', () => {
    expect(
      flow2DepositEligible({
        pickupType: 'merchant_dropoff',
        parcelStatus: 'created',
        lockerType: 'SMART_LOCKER',
      }),
    ).toBe(true);
    expect(
      flow2DepositEligible({
        pickupType: 'merchant_dropoff',
        parcelStatus: 'in_transit',
        lockerType: 'SMART_LOCKER',
      }),
    ).toBe(false);
  });

  it('authorizes return deposit only when collected + authorized return', () => {
    expect(
      recipientReturnDepositEligible({
        parcelStatus: 'collected',
        returnStatus: 'authorized',
        lockerType: 'SMART_LOCKER',
      }),
    ).toBe(true);
    expect(
      recipientReturnDepositEligible({
        parcelStatus: 'collected',
        returnStatus: 'requested',
        lockerType: 'SMART_LOCKER',
      }),
    ).toBe(false);
    expect(
      recipientReturnDepositEligible({
        parcelStatus: 'collected',
        returnStatus: 'authorized',
        lockerType: 'PARTNER_POINT',
      }),
    ).toBe(false);
  });

  it('separates Flow 3A driver pickup from Flow 3B business pickup', () => {
    expect(
      driverReturnPickupEligible({
        parcelStatus: 'return_at_point',
        returnStatus: 'awaiting_pickup',
        returnMethod: 'eveider_return',
      }),
    ).toBe(true);
    expect(
      driverReturnPickupEligible({
        parcelStatus: 'return_at_point',
        returnStatus: 'awaiting_pickup',
        returnMethod: 'business_pickup',
      }),
    ).toBe(false);
  });

  it('does not treat AT_POINT as collection-eligible', () => {
    expect(recipientCollectionEligible('ready_for_pickup')).toBe(true);
    expect(recipientCollectionEligible('delivered_to_locker')).toBe(false);
  });
});

describe('commercial denial mapping', () => {
  it('maps outstanding and missing charge without mentioning PawaPay', () => {
    expect(lockerDenialFromCommercial('PAYMENT_OUTSTANDING')).toBe('PAYMENT_REQUIRED');
    expect(lockerDenialFromCommercial('CANONICAL_CHARGE_MISSING')).toBe('CANONICAL_CHARGE_MISSING');
    expect(lockerDenialFromCommercial('AUTHORIZED')).toBeNull();
    expect(lockerDenialFromCommercial('NOT_READY')).toBe('INVALID_PARCEL_STATE');
  });
});

describe('compartment pick and delivery complete', () => {
  it('prefers the smallest suitable available compartment', () => {
    const picked = pickDepositCompartment(
      [
        { id: 'large', label: 'C1', size: 'large', status: 'available' },
        { id: 'medium', label: 'B1', size: 'medium', status: 'available' },
        { id: 'small-busy', label: 'A1', size: 'small', status: 'occupied' },
      ],
      'small',
    );
    expect(picked?.id).toBe('medium');
  });

  it('completes outbound Livraison from started without requiring drop_off_pending', () => {
    expect(canCompleteOutboundDeliveryFromLocker('started')).toBe(true);
    expect(canCompleteOutboundDeliveryFromLocker('assigned')).toBe(false);
    expect(completeOutboundDeliveryFromLocker('started')).toBe('completed');
    expect(completeOutboundDeliveryFromLocker('completed')).toBe('completed');
    expect(() => completeOutboundDeliveryFromLocker('failed')).toThrow(/locker deposit/);
  });
});

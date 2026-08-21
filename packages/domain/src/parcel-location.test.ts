import { describe, expect, it } from 'vitest';
import type { DeliveryStatus } from './delivery.js';
import type { ParcelStatus } from './parcel.js';
import {
  BUSINESS_PARCEL_LOCATIONS,
  businessParcelProgression,
  markBusinessParcelProgression,
  resolveBusinessParcelLocation,
  type BusinessParcelLocationInput,
} from './parcel-location.js';
import type { ShipmentPickupType } from './shipment.js';

function input(partial: {
  parcelStatus?: ParcelStatus;
  pickupType?: ShipmentPickupType;
  latestDeliveryStatus?: DeliveryStatus | null;
}): BusinessParcelLocationInput {
  return {
    parcelStatus: partial.parcelStatus ?? 'created',
    pickupType: partial.pickupType ?? 'courier_pickup',
    latestDeliveryStatus: partial.latestDeliveryStatus ?? null,
  };
}

describe('business parcel location', () => {
  it('lists every current-location key used by Colis filters', () => {
    expect(BUSINESS_PARCEL_LOCATIONS).toEqual([
      'awaiting_courier',
      'awaiting_dropoff',
      'courier_assigned',
      'in_transit',
      'at_locker',
      'ready_for_pickup',
      'collected',
    ]);
  });

  it('uses different ladders per pickup type', () => {
    expect(businessParcelProgression('courier_pickup')).toEqual([
      'submitted',
      'awaiting_courier',
      'courier_assigned',
      'in_transit',
      'at_locker',
      'ready_for_pickup',
      'collected',
    ]);
    expect(businessParcelProgression('merchant_dropoff')).toEqual([
      'submitted',
      'awaiting_dropoff',
      'in_transit',
      'at_locker',
      'ready_for_pickup',
      'collected',
    ]);
  });

  it('maps created courier-pickup parcels from the latest delivery', () => {
    expect(resolveBusinessParcelLocation(input({}))).toBe('awaiting_courier');
    expect(
      resolveBusinessParcelLocation(input({ latestDeliveryStatus: 'assigned' })),
    ).toBe('courier_assigned');
    expect(
      resolveBusinessParcelLocation(input({ latestDeliveryStatus: 'failed' })),
    ).toBe('awaiting_courier');
  });

  it('does not surface courier_assigned on merchant drop-off', () => {
    expect(
      resolveBusinessParcelLocation(
        input({ pickupType: 'merchant_dropoff', latestDeliveryStatus: 'assigned' }),
      ),
    ).toBe('awaiting_dropoff');
    expect(resolveBusinessParcelLocation(input({ pickupType: 'merchant_dropoff' }))).toBe(
      'awaiting_dropoff',
    );
  });

  it('treats courier scan as in transit even if parcel status has not caught up', () => {
    expect(
      resolveBusinessParcelLocation(input({ latestDeliveryStatus: 'scanned' })),
    ).toBe('in_transit');
    expect(
      resolveBusinessParcelLocation(
        input({ pickupType: 'merchant_dropoff', latestDeliveryStatus: 'drop_off_pending' }),
      ),
    ).toBe('in_transit');
  });

  it('lets parcel status win after created', () => {
    expect(resolveBusinessParcelLocation(input({ parcelStatus: 'in_transit' }))).toBe(
      'in_transit',
    );
    expect(
      resolveBusinessParcelLocation(input({ parcelStatus: 'delivered_to_locker' })),
    ).toBe('at_locker');
    expect(
      resolveBusinessParcelLocation(input({ parcelStatus: 'ready_for_pickup' })),
    ).toBe('ready_for_pickup');
    expect(resolveBusinessParcelLocation(input({ parcelStatus: 'collected' }))).toBe(
      'collected',
    );
  });

  it('keeps arrived-at-locker distinct from ready-for-pickup', () => {
    const atLocker = resolveBusinessParcelLocation(
      input({ parcelStatus: 'delivered_to_locker', latestDeliveryStatus: 'completed' }),
    );
    const ready = resolveBusinessParcelLocation(
      input({ parcelStatus: 'ready_for_pickup', latestDeliveryStatus: 'completed' }),
    );
    expect(atLocker).toBe('at_locker');
    expect(ready).toBe('ready_for_pickup');
    expect(atLocker).not.toBe(ready);
  });

  it('marks submitted as history and the derived location as current', () => {
    const marks = markBusinessParcelProgression(input({ latestDeliveryStatus: 'assigned' }));
    expect(marks.find((mark) => mark.step === 'submitted')).toMatchObject({
      reached: true,
      current: false,
    });
    expect(marks.find((mark) => mark.step === 'courier_assigned')).toMatchObject({
      reached: true,
      current: true,
    });
    expect(marks.find((mark) => mark.step === 'in_transit')?.reached).toBe(false);
  });

  it('omits courier_assigned from the merchant drop-off timeline', () => {
    const steps = markBusinessParcelProgression(
      input({ pickupType: 'merchant_dropoff', parcelStatus: 'in_transit' }),
    ).map((mark) => mark.step);
    expect(steps).not.toContain('courier_assigned');
    expect(steps).not.toContain('awaiting_courier');
  });
});

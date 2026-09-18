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
  latestDeliveryKind?: 'outbound' | 'return' | 'customer_return' | null;
  customerReturn?: BusinessParcelLocationInput['customerReturn'];
}): BusinessParcelLocationInput {
  return {
    parcelStatus: partial.parcelStatus ?? 'created',
    pickupType: partial.pickupType ?? 'courier_pickup',
    latestDeliveryStatus: partial.latestDeliveryStatus ?? null,
    latestDeliveryKind: partial.latestDeliveryKind ?? null,
    customerReturn: partial.customerReturn ?? null,
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
      'return_in_progress',
      'returned_to_business',
      'collected',
      'customer_return_requested',
      'customer_return_authorized',
      'customer_return_at_locker',
      'customer_return_in_transit',
      'customer_return_completed',
    ]);
  });

  it('uses parcel-lifecycle ladders per pickup type', () => {
    expect(businessParcelProgression('courier_pickup')).toEqual([
      'submitted',
      'awaiting_courier',
      'in_transit',
      'at_locker',
      'ready_for_pickup',
      'collected',
    ]);
    expect(businessParcelProgression('merchant_dropoff')).toEqual([
      'submitted',
      'awaiting_dropoff',
      'at_locker',
      'ready_for_pickup',
      'collected',
    ]);
  });

  it('maps created parcels from pickup type, with assignment as presentation overlay', () => {
    expect(resolveBusinessParcelLocation(input({}))).toBe('awaiting_courier');
    expect(
      resolveBusinessParcelLocation(input({ latestDeliveryStatus: 'assigned' })),
    ).toBe('courier_assigned');
    expect(
      resolveBusinessParcelLocation(input({ latestDeliveryStatus: 'failed' })),
    ).toBe('awaiting_courier');
  });

  it('does not invent in_transit from a delivery scan while parcel is created', () => {
    expect(
      resolveBusinessParcelLocation(input({ latestDeliveryStatus: 'scanned' })),
    ).toBe('courier_assigned');
    expect(
      resolveBusinessParcelLocation(
        input({ pickupType: 'merchant_dropoff', latestDeliveryStatus: 'drop_off_pending' }),
      ),
    ).toBe('awaiting_dropoff');
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

  it('marks submitted as history and awaiting handoff as the ladder current step', () => {
    const marks = markBusinessParcelProgression(input({ latestDeliveryStatus: 'assigned' }));
    expect(resolveBusinessParcelLocation(input({ latestDeliveryStatus: 'assigned' }))).toBe(
      'courier_assigned',
    );
    expect(marks.find((mark) => mark.step === 'submitted')).toMatchObject({
      reached: true,
      current: false,
    });
    expect(marks.find((mark) => mark.step === 'awaiting_courier')).toMatchObject({
      reached: true,
      current: true,
    });
    expect(marks.find((mark) => mark.step === 'courier_assigned')).toBeUndefined();
    expect(marks.find((mark) => mark.step === 'in_transit')?.reached).toBe(false);
  });

  it('omits courier_assigned and in_transit from the merchant drop-off timeline', () => {
    const steps = markBusinessParcelProgression(
      input({ pickupType: 'merchant_dropoff', parcelStatus: 'created' }),
    ).map((mark) => mark.step);
    expect(steps).not.toContain('courier_assigned');
    expect(steps).not.toContain('awaiting_courier');
    expect(steps).not.toContain('in_transit');
  });

  it('overlays historical RTS locations without using them as the default ladder', () => {
    expect(
      resolveBusinessParcelLocation(
        input({
          parcelStatus: 'ready_for_pickup',
          latestDeliveryKind: 'return',
          latestDeliveryStatus: 'assigned',
        }),
      ),
    ).toBe('return_in_progress');
    expect(
      resolveBusinessParcelLocation(
        input({
          parcelStatus: 'ready_for_pickup',
          latestDeliveryKind: 'return',
          latestDeliveryStatus: 'completed',
        }),
      ),
    ).toBe('returned_to_business');
    expect(businessParcelProgression('courier_pickup')).not.toContain('return_in_progress');
    expect(
      businessParcelProgression('courier_pickup', 'returned_to_business'),
    ).toContain('returned_to_business');
  });

  it('derives customer-return labels from parcel + Return, distinct from legacy RTS', () => {
    expect(
      resolveBusinessParcelLocation(
        input({
          parcelStatus: 'collected',
          customerReturn: { status: 'requested', method: null },
        }),
      ),
    ).toBe('customer_return_requested');
    expect(
      resolveBusinessParcelLocation(
        input({
          parcelStatus: 'collected',
          customerReturn: { status: 'authorized', method: 'eveider_return' },
        }),
      ),
    ).toBe('customer_return_authorized');
    expect(
      resolveBusinessParcelLocation(
        input({
          parcelStatus: 'return_at_point',
          customerReturn: { status: 'awaiting_pickup', method: 'business_pickup' },
        }),
      ),
    ).toBe('customer_return_at_locker');
    expect(
      resolveBusinessParcelLocation(
        input({
          parcelStatus: 'returning',
          customerReturn: { status: 'in_transit', method: 'eveider_return' },
          latestDeliveryKind: 'customer_return',
          latestDeliveryStatus: 'scanned',
        }),
      ),
    ).toBe('customer_return_in_transit');
    expect(
      resolveBusinessParcelLocation(
        input({
          parcelStatus: 'returned',
          customerReturn: { status: 'completed', method: 'eveider_return' },
        }),
      ),
    ).toBe('customer_return_completed');
    expect(
      resolveBusinessParcelLocation(
        input({
          parcelStatus: 'ready_for_pickup',
          latestDeliveryKind: 'return',
          latestDeliveryStatus: 'assigned',
        }),
      ),
    ).toBe('return_in_progress');
    expect(
      businessParcelProgression('courier_pickup', 'customer_return_at_locker', 'business_pickup'),
    ).not.toContain('customer_return_in_transit');
    expect(
      businessParcelProgression('courier_pickup', 'customer_return_in_transit', 'eveider_return'),
    ).toContain('customer_return_in_transit');
  });
});

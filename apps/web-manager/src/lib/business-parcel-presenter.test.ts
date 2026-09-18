import { describe, expect, it } from 'vitest';
import { toBusinessParcelLocationView } from './business-parcel-presenter';

describe('toBusinessParcelLocationView', () => {
  it('keeps courier assignment as a Situation overlay, not a parcel lifecycle step', () => {
    const view = toBusinessParcelLocationView({
      status: 'created',
      pickupType: 'courier_pickup',
      latestDeliveryStatus: 'assigned',
    });

    expect(view.location).toBe('courier_assigned');
    expect(view.locationLabel).toBe('CHAUFFEUR ASSIGNÉ');
    expect(view.progression.find((step) => step.current)?.step).toBe('awaiting_courier');
    expect(view.progression.map((step) => step.step)).not.toContain('courier_assigned');
  });

  it('uses awaiting drop-off for merchant create', () => {
    const view = toBusinessParcelLocationView({
      status: 'created',
      pickupType: 'merchant_dropoff',
      latestDeliveryStatus: 'assigned',
    });

    expect(view.location).toBe('awaiting_dropoff');
    expect(view.progression.map((step) => step.step)).not.toContain('courier_assigned');
    expect(view.progression.map((step) => step.step)).not.toContain('in_transit');
  });

  it('keeps arrived at point distinct from ready for pickup', () => {
    expect(
      toBusinessParcelLocationView({
        status: 'delivered_to_locker',
        pickupType: 'courier_pickup',
        latestDeliveryStatus: 'completed',
      }).location,
    ).toBe('at_locker');
    expect(
      toBusinessParcelLocationView({
        status: 'ready_for_pickup',
        pickupType: 'courier_pickup',
        latestDeliveryStatus: 'completed',
      }).location,
    ).toBe('ready_for_pickup');
  });

  it('derives historical RTS locations from the latest delivery kind', () => {
    expect(
      toBusinessParcelLocationView({
        status: 'ready_for_pickup',
        pickupType: 'courier_pickup',
        latestDeliveryStatus: 'assigned',
        latestDeliveryKind: 'return',
      }).location,
    ).toBe('return_in_progress');
    expect(
      toBusinessParcelLocationView({
        status: 'ready_for_pickup',
        pickupType: 'courier_pickup',
        latestDeliveryStatus: 'completed',
        latestDeliveryKind: 'return',
      }).location,
    ).toBe('returned_to_business');
  });

  it('overlays customer-return process labels without treating RTS as a customer return', () => {
    expect(
      toBusinessParcelLocationView({
        status: 'collected',
        pickupType: 'courier_pickup',
        latestDeliveryStatus: 'completed',
        latestDeliveryKind: 'outbound',
        customerReturn: { status: 'requested', method: null },
      }).location,
    ).toBe('customer_return_requested');
    expect(
      toBusinessParcelLocationView({
        status: 'collected',
        pickupType: 'courier_pickup',
        latestDeliveryStatus: 'completed',
        latestDeliveryKind: 'return',
        customerReturn: { status: 'rejected', method: null },
      }).location,
    ).toBe('collected');
  });
});

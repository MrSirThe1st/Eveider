import { describe, expect, it } from 'vitest';
import { toBusinessParcelLocationView } from './business-parcel-presenter';

describe('toBusinessParcelLocationView', () => {
  it('surfaces courier assignment without treating it as a parcel status', () => {
    const view = toBusinessParcelLocationView({
      status: 'created',
      pickupType: 'courier_pickup',
      latestDeliveryStatus: 'assigned',
    });

    expect(view.location).toBe('courier_assigned');
    expect(view.locationLabel).toBe('COURSIER ASSIGNÉ');
    expect(view.progression.find((step) => step.current)?.step).toBe('courier_assigned');
  });

  it('uses awaiting drop-off for merchant create, even if a courier is assigned', () => {
    const view = toBusinessParcelLocationView({
      status: 'created',
      pickupType: 'merchant_dropoff',
      latestDeliveryStatus: 'assigned',
    });

    expect(view.location).toBe('awaiting_dropoff');
    expect(view.progression.map((step) => step.step)).not.toContain('courier_assigned');
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

  it('derives return locations from the latest delivery kind', () => {
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
});

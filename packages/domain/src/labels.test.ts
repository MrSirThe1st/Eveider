import { describe, expect, it } from 'vitest';
import { BUSINESS_PARCEL_LOCATION_LABELS, PARCEL_STATUS_LABELS } from './labels.js';

describe('French UI labels', () => {
  it('uses ALL CAPS parcel status labels', () => {
    expect(PARCEL_STATUS_LABELS.ready_for_pickup).toBe('PRÊT POUR RETRAIT');
    expect(PARCEL_STATUS_LABELS.collected).toBe('RETIRÉ');
  });

  it('keeps arrived-at-point distinct from ready-for-pickup', () => {
    expect(BUSINESS_PARCEL_LOCATION_LABELS.at_locker).toBe('ARRIVÉ AU POINT');
    expect(BUSINESS_PARCEL_LOCATION_LABELS.ready_for_pickup).toBe('PRÊT POUR RETRAIT');
  });
});

import { describe, expect, it } from 'vitest';
import { PARCEL_STATUS_LABELS } from './labels.js';

describe('French UI labels', () => {
  it('uses ALL CAPS parcel status labels', () => {
    expect(PARCEL_STATUS_LABELS.ready_for_pickup).toBe('PRÊT POUR RETRAIT');
    expect(PARCEL_STATUS_LABELS.collected).toBe('RETIRÉ');
  });
});

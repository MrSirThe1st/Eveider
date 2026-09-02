import { describe, expect, it } from 'vitest';
import {
  BUSINESS_PARCEL_LOCATION_LABELS,
  PARCEL_EVENT_TYPE_LABELS,
  PARCEL_STATUS_LABELS,
} from './labels.js';
import { PARCEL_EVENT_TYPES } from './parcel-event.js';

describe('French UI labels', () => {
  it('uses ALL CAPS parcel status labels', () => {
    expect(PARCEL_STATUS_LABELS.ready_for_pickup).toBe('PRÊT POUR RETRAIT');
    expect(PARCEL_STATUS_LABELS.collected).toBe('RETIRÉ');
  });

  it('keeps arrived-at-point distinct from ready-for-pickup', () => {
    expect(BUSINESS_PARCEL_LOCATION_LABELS.at_locker).toBe('ARRIVÉ AU POINT');
    expect(BUSINESS_PARCEL_LOCATION_LABELS.ready_for_pickup).toBe('PRÊT POUR RETRAIT');
  });

  it('labels return legs without a parcel returned status', () => {
    expect(BUSINESS_PARCEL_LOCATION_LABELS.return_in_progress).toBe('RETOUR EN COURS');
    expect(BUSINESS_PARCEL_LOCATION_LABELS.returned_to_business).toBe('RETOURNÉ');
  });

  it('covers every parcel event type with ALL CAPS labels', () => {
    for (const type of PARCEL_EVENT_TYPES) {
      expect(PARCEL_EVENT_TYPE_LABELS[type]).toMatch(/^[A-ZÀÂÄÉÈÊËÎÏÔÙÛÜÇŒ0-9'’ ·-]+$/);
    }
    expect(PARCEL_EVENT_TYPE_LABELS['delivery.completed']).toBe('DÉPÔT TERMINÉ');
  });
});

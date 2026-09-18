import { describe, expect, it } from 'vitest';
import {
  BUSINESS_PARCEL_LOCATION_LABELS,
  PARCEL_CHARGE_KIND_LABELS,
  PARCEL_EVENT_TYPE_LABELS,
  PARCEL_STATUS_LABELS,
} from './labels.js';
import { PARCEL_CHARGE_KINDS } from './pricing.js';
import { PARCEL_EVENT_TYPES } from './parcel-event.js';

describe('French UI labels', () => {
  it('uses ALL CAPS parcel status labels', () => {
    expect(PARCEL_STATUS_LABELS.ready_for_pickup).toBe('PRÊT POUR RETRAIT');
    expect(PARCEL_STATUS_LABELS.collected).toBe('RETIRÉ');
  });

  it('keeps arrived-at-point distinct from ready-for-pickup', () => {
    expect(BUSINESS_PARCEL_LOCATION_LABELS.at_locker).toBe('AU CASIER');
    expect(BUSINESS_PARCEL_LOCATION_LABELS.courier_assigned).toBe('CHAUFFEUR ASSIGNÉ');
    expect(BUSINESS_PARCEL_LOCATION_LABELS.ready_for_pickup).toBe('PRÊT POUR RETRAIT');
  });

  it('labels historical RTS separately from new customer returns', () => {
    expect(BUSINESS_PARCEL_LOCATION_LABELS.return_in_progress).toBe('RETOUR EN COURS');
    expect(BUSINESS_PARCEL_LOCATION_LABELS.returned_to_business).toBe('RETOURNÉ');
    expect(BUSINESS_PARCEL_LOCATION_LABELS.customer_return_requested).toBe('RETOUR DEMANDÉ');
    expect(BUSINESS_PARCEL_LOCATION_LABELS.customer_return_authorized).toBe('RETOUR AUTORISÉ');
    expect(BUSINESS_PARCEL_LOCATION_LABELS.customer_return_at_locker).toBe('RETOUR AU CASIER');
    expect(BUSINESS_PARCEL_LOCATION_LABELS.customer_return_completed).toBe('RETOURNÉ AU MARCHAND');
  });

  it('covers every parcel event type with ALL CAPS labels', () => {
    for (const type of PARCEL_EVENT_TYPES) {
      expect(PARCEL_EVENT_TYPE_LABELS[type]).toMatch(/^[A-ZÀÂÄÉÈÊËÎÏÔÙÛÜÇŒ0-9'’ ·-]+$/);
    }
    expect(PARCEL_EVENT_TYPE_LABELS['delivery.completed']).toBe('DÉPÔT TERMINÉ');
  });

  it('labels canonical and historical charge kinds', () => {
    for (const kind of PARCEL_CHARGE_KINDS) {
      expect(PARCEL_CHARGE_KIND_LABELS[kind].length).toBeGreaterThan(0);
    }
    expect(PARCEL_CHARGE_KIND_LABELS.outbound_delivery).toBe('Livraison Eveider');
    expect(PARCEL_CHARGE_KIND_LABELS.locker_collection).toBe('Frais de casier');
    expect(PARCEL_CHARGE_KIND_LABELS.return_delivery).toBe('Retour Eveider');
    expect(PARCEL_CHARGE_KIND_LABELS.return_locker).toBe('Retrait marchand au casier');
    expect(PARCEL_CHARGE_KIND_LABELS.delivery_fee).toContain('historique');
    expect(PARCEL_CHARGE_KIND_LABELS.drop_off_fee).toContain('historique');
  });
});

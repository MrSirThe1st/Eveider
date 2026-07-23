import { describe, expect, it } from 'vitest';
import {
  createLockerSchema,
  nearestLockersQuerySchema,
  updateCompartmentStatusSchema,
  updateLockerStatusSchema,
} from './locker.js';

const baseCompartments = Array.from({ length: 9 }, (_, index) => {
  const row = String.fromCharCode(65 + Math.floor(index / 3));
  const col = (index % 3) + 1;
  return { label: `${row}${col}`, size: 'medium' as const };
});

describe('createLockerSchema', () => {
  it('accepts a valid smart locker payload', () => {
    const result = createLockerSchema.safeParse({
      type: 'SMART_LOCKER',
      code: 'EVPA7K3M2B',
      name: 'Kolwezi Centre',
      address: 'Avenue du Commerce, Kolwezi',
      latitude: -4.32,
      longitude: 15.31,
      rows: 3,
      columns: 3,
      compartments: baseCompartments,
      status: 'active',
    });
    expect(result.success).toBe(true);
  });

  it('defaults type to SMART_LOCKER when omitted', () => {
    const result = createLockerSchema.safeParse({
      code: 'EVPA7K3M2B',
      name: 'Kolwezi Centre',
      address: 'Avenue du Commerce, Kolwezi',
      latitude: -4.32,
      longitude: 15.31,
      rows: 3,
      columns: 3,
      compartments: baseCompartments,
      status: 'active',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe('SMART_LOCKER');
    }
  });

  it('requires compartments matching grid dimensions', () => {
    expect(
      createLockerSchema.safeParse({
        name: 'GOMBE',
        address: 'Avenue du Commerce',
        latitude: -4.32,
        longitude: 15.31,
        rows: 3,
        columns: 3,
        compartments: baseCompartments.slice(0, 4),
      }).success,
    ).toBe(false);
  });

  it('accepts a partner point with soft capacity', () => {
    const result = createLockerSchema.safeParse({
      type: 'PARTNER_POINT',
      name: 'Pharmacie XYZ',
      address: 'Avenue Lumumba, Gombe',
      latitude: -4.32,
      longitude: 15.31,
      maxCapacity: 20,
      contactPhone: '+243810000000',
      contactName: 'Jean Partner',
      commissionType: 'percent',
      commissionValue: 5,
      commissionCurrency: 'CDF',
      status: 'active',
    });
    expect(result.success).toBe(true);
  });

  it('requires maxCapacity and contactPhone for residential points', () => {
    expect(
      createLockerSchema.safeParse({
        type: 'RESIDENTIAL_LOCKER',
        name: 'Résidence Les Palmiers',
        address: 'Avenue des Palmiers',
        latitude: -4.32,
        longitude: 15.31,
        status: 'active',
      }).success,
    ).toBe(false);
  });
});

describe('nearestLockersQuerySchema', () => {
  it('accepts coordinates', () => {
    expect(
      nearestLockersQuerySchema.safeParse({ latitude: -4.32, longitude: 15.31 }).success,
    ).toBe(true);
  });
});

describe('updateLockerStatusSchema', () => {
  it('accepts valid locker status', () => {
    expect(updateLockerStatusSchema.safeParse({ status: 'offline' }).success).toBe(true);
  });

  it('rejects invalid status', () => {
    expect(updateLockerStatusSchema.safeParse({ status: 'invalid' }).success).toBe(false);
  });
});

describe('updateCompartmentStatusSchema', () => {
  it('accepts valid compartment status', () => {
    expect(updateCompartmentStatusSchema.safeParse({ status: 'reserved' }).success).toBe(true);
  });
});

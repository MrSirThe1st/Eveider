import { describe, expect, it } from 'vitest';
import { toBusinessLockerDto } from './locker-presenter';

describe('toBusinessLockerDto', () => {
  it('exposes location, capacity, availability and operating status', () => {
    const dto = toBusinessLockerDto({
      id: '11111111-1111-1111-1111-111111111111',
      name: 'Gombe',
      address: 'Boulevard du 30 Juin, Gombe',
      type: 'SMART_LOCKER',
      status: 'active',
      availableCompartments: 12,
      availableSlots: 12,
      occupyingCount: 0,
      compartmentTotal: 16,
      rows: 4,
      columns: 4,
      latitude: -4.32,
      longitude: 15.31,
      availableBySize: { small: 4, medium: 6, large: 2 },
    });

    expect(dto.networkLabel).toBe('Casier — Gombe');
    expect(dto.capacity).toBe(16);
    expect(dto.availableLabel).toBe('12 compartiments disponibles');
    expect(dto.operatingStatus).toBe('active');
    expect(dto.selectable).toBe(true);
  });

  it('marks an empty active locker as full and not selectable', () => {
    const dto = toBusinessLockerDto({
      id: '11111111-1111-1111-1111-111111111111',
      name: 'Gombe',
      address: 'Boulevard du 30 Juin, Gombe',
      type: 'SMART_LOCKER',
      status: 'active',
      availableCompartments: 0,
      availableSlots: 0,
      occupyingCount: 16,
      compartmentTotal: 16,
      rows: 4,
      columns: 4,
      latitude: -4.32,
      longitude: 15.31,
    });

    expect(dto.operatingStatus).toBe('full');
    expect(dto.operatingStatusLabel).toBe('Complet');
    expect(dto.selectable).toBe(false);
  });
});

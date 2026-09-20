import { describe, expect, it } from 'vitest';
import { createDataAccessContext } from '../context.js';
import { createSqlMatchMock, lockerRow, sqlIncludes } from '../test/query-mock.js';
import { LockerRepository } from './locker.repository.js';

describe('LockerRepository.listActivePickerOptions', () => {
  it('selects id, name, and address without availability joins', async () => {
    const db = createSqlMatchMock((sql, values) => {
      if (sqlIncludes(sql, 'SELECT id, name, address') && sqlIncludes(sql, 'FROM lockers')) {
        expect(values).toEqual(['SMART_LOCKER']);
        return lockerRow({ id: 'locker-1', name: 'Gombe', address: 'Boulevard du 30 Juin' });
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const repo = new LockerRepository(db);
    const options = await repo.listActivePickerOptions();

    expect(db.query).toHaveBeenCalledTimes(1);
    expect(options).toEqual([
      { id: 'locker-1', name: 'Gombe', address: 'Boulevard du 30 Juin' },
    ]);
  });
});

describe('LockerRepository.listByCity', () => {
  it('filters network points by city', async () => {
    const db = createSqlMatchMock((sql, values) => {
      if (sqlIncludes(sql, 'FROM lockers l') && sqlIncludes(sql, 'lower(l.city)')) {
        expect(values?.[0]).toBe('Lubumbashi');
        return lockerRow({
          id: 'locker-1',
          name: 'EVEIDER KENYA',
          address: 'Lubumbashi',
          city: 'Lubumbashi',
          type: 'SMART_LOCKER',
          available_count: 4,
          occupying_count: 0,
        });
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const repo = new LockerRepository(db);
    const items = await repo.listByCity('Lubumbashi');

    expect(items).toHaveLength(1);
    expect(items[0]?.name).toBe('EVEIDER KENYA');
    expect(items[0]?.city).toBe('Lubumbashi');
  });
});

describe('LockerRepository.create', () => {
  const adminCtx = createDataAccessContext('admin', { userId: 'admin-1' });

  it('requires an explicit zone for an active SMART_LOCKER', async () => {
    const db = createSqlMatchMock(() => {
      throw new Error('should not auto-select a zone');
    });
    const repo = new LockerRepository(db);

    await expect(
      repo.create(adminCtx, {
        name: 'Eveider Golf',
        address: 'Avenue du Golf, Kolwezi',
        latitude: -10.7,
        longitude: 25.5,
        status: 'active',
        rows: 3,
        columns: 3,
        compartments: Array.from({ length: 9 }, (_, index) => ({
          label: `${String.fromCharCode(65 + Math.floor(index / 3))}${(index % 3) + 1}`,
          size: 'medium' as const,
        })),
      }),
    ).rejects.toThrow('Un casier intelligent actif doit appartenir à une zone');
  });

  it('rejects an archived zone', async () => {
    const db = createSqlMatchMock((sql) => {
      if (sqlIncludes(sql, 'FROM service_areas sa') && sqlIncludes(sql, 'JOIN cities')) {
        return {
          id: 'zone-1',
          status: 'archived',
          city_name: 'Kolwezi',
          city_status: 'active',
        };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const repo = new LockerRepository(db);

    await expect(
      repo.create(adminCtx, {
        name: 'Eveider Golf',
        address: 'Avenue du Golf, Kolwezi',
        latitude: -10.7,
        longitude: 25.5,
        status: 'active',
        serviceAreaId: 'zone-1',
        rows: 1,
        columns: 1,
        compartments: [{ label: 'A1', size: 'medium' }],
      }),
    ).rejects.toThrow('Cette zone de service n’est plus active');
  });

  it('rejects a zone whose city is archived', async () => {
    const db = createSqlMatchMock((sql) => {
      if (sqlIncludes(sql, 'FROM service_areas sa') && sqlIncludes(sql, 'JOIN cities')) {
        return {
          id: 'zone-1',
          status: 'active',
          city_name: 'Kolwezi',
          city_status: 'archived',
        };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const repo = new LockerRepository(db);

    await expect(
      repo.create(adminCtx, {
        name: 'Eveider Golf',
        address: 'Avenue du Golf, Kolwezi',
        latitude: -10.7,
        longitude: 25.5,
        status: 'active',
        serviceAreaId: 'zone-1',
        rows: 1,
        columns: 1,
        compartments: [{ label: 'A1', size: 'medium' }],
      }),
    ).rejects.toThrow('Cette ville n’est plus active');
  });
});

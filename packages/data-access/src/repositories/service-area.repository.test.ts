import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDataAccessContext } from '../context.js';
import { createSqlMatchMock, sqlIncludes } from '../test/query-mock.js';
import { ServiceAreaRepository } from './service-area.repository.js';

function serviceAreaRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'area-1',
    code: 'LSH',
    name: 'Lubumbashi',
    city: 'Lubumbashi',
    city_id: 'city-lsh',
    city_name: 'Lubumbashi',
    status: 'active',
    notes: null,
    outbound_delivery_amount: 1500,
    return_delivery_amount: 1500,
    created_at: new Date('2026-09-02T12:00:00.000Z'),
    updated_at: new Date('2026-09-02T12:00:00.000Z'),
    locker_count: 3,
    ...overrides,
  };
}

function cityRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'city-kin',
    code: 'KIN',
    name: 'Kinshasa',
    status: 'active',
    notes: null,
    created_at: new Date('2026-09-02T12:00:00.000Z'),
    updated_at: new Date('2026-09-02T12:00:00.000Z'),
    ...overrides,
  };
}

describe('ServiceAreaRepository', () => {
  const adminCtx = createDataAccessContext('admin', { userId: 'admin-1' });
  let db = createSqlMatchMock(() => null);
  let repo: ServiceAreaRepository;

  function setup(
    resolve: (
      sql: string,
      values?: unknown[],
    ) => Record<string, unknown> | Record<string, unknown>[] | null,
  ) {
    db = createSqlMatchMock(resolve);
    repo = new ServiceAreaRepository(db);
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists active areas with locker counts', async () => {
    setup((sql) => {
      if (sqlIncludes(sql, 'FROM service_areas sa')) {
        return [
          serviceAreaRow(),
          serviceAreaRow({
            id: 'area-2',
            code: 'KWZ',
            name: 'Kolwezi',
            city: 'Kolwezi',
            city_id: 'city-kwz',
            city_name: 'Kolwezi',
            locker_count: 1,
          }),
        ];
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const areas = await repo.list(adminCtx);
    expect(areas).toHaveLength(2);
    expect(areas[0]?.lockerCount).toBe(3);
    expect(areas[0]?.code).toBe('LSH');
    expect(areas[0]?.cityId).toBe('city-lsh');
    expect(areas[0]?.outboundDeliveryAmount).toBe(1500);
  });

  it('creates a zone without configuring prices', async () => {
    setup((sql) => {
      if (sqlIncludes(sql, 'FROM cities') && sqlIncludes(sql, 'lower(name)')) {
        return cityRow();
      }
      if (sqlIncludes(sql, 'INSERT INTO service_areas')) {
        return { id: 'area-kin' };
      }
      if (sqlIncludes(sql, 'INSERT INTO zone_pricing')) {
        return { zone_id: 'area-kin' };
      }
      if (sqlIncludes(sql, 'FROM service_areas sa') && sqlIncludes(sql, 'sa.id = $1')) {
        return serviceAreaRow({
          id: 'area-kin',
          code: 'KIN',
          name: 'Gombe',
          city: 'Kinshasa',
          city_id: 'city-kin',
          city_name: 'Kinshasa',
          outbound_delivery_amount: null,
          return_delivery_amount: null,
          locker_count: 0,
        });
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const area = await repo.create(adminCtx, {
      code: 'kin-gombe',
      name: 'Gombe',
      city: 'Kinshasa',
    });

    expect(area.code).toBe('KIN');
    expect(area.outboundDeliveryAmount).toBeNull();
    expect(area.returnDeliveryAmount).toBeNull();
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO zone_pricing'),
      ['area-kin', null, null],
    );
  });

  it('allows the same zone name in two cities', async () => {
    setup((sql) => {
      if (sqlIncludes(sql, 'FROM cities') && sqlIncludes(sql, 'lower(name)')) {
        return cityRow({ id: 'city-kwz', name: 'Kolwezi', code: 'KWZ' });
      }
      if (sqlIncludes(sql, 'INSERT INTO service_areas')) {
        return { id: 'area-golf' };
      }
      if (sqlIncludes(sql, 'INSERT INTO zone_pricing')) {
        return { zone_id: 'area-golf' };
      }
      if (sqlIncludes(sql, 'FROM service_areas sa')) {
        return serviceAreaRow({
          id: 'area-golf',
          code: 'KWZ-GOLF',
          name: 'Golf',
          city: 'Kolwezi',
          city_id: 'city-kwz',
          city_name: 'Kolwezi',
          outbound_delivery_amount: null,
          return_delivery_amount: null,
          locker_count: 0,
        });
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const area = await repo.create(adminCtx, {
      code: 'kwz-golf',
      name: 'Golf',
      city: 'Kolwezi',
    });
    expect(area.name).toBe('Golf');
    expect(area.city).toBe('Kolwezi');
  });

  it('rejects non-admin list', async () => {
    setup(() => {
      throw new Error('should not query');
    });
    const businessCtx = createDataAccessContext('business', {
      userId: 'biz-1',
      businessId: 'biz-1',
    });
    await expect(repo.list(businessCtx)).rejects.toThrow();
  });

  it('maps ZONE_HAS_ACTIVE_LOCKERS to a French archive error', async () => {
    setup((sql) => {
      if (sqlIncludes(sql, 'FROM service_areas sa') && sqlIncludes(sql, 'sa.id = $1')) {
        return serviceAreaRow();
      }
      if (sqlIncludes(sql, 'UPDATE service_areas')) {
        throw new Error('ZONE_HAS_ACTIVE_LOCKERS');
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    await expect(repo.update(adminCtx, 'area-1', { status: 'archived' })).rejects.toThrow(
      'Impossible d’archiver une zone qui a encore des casiers actifs',
    );
  });

  it('rejects a duplicate zone name in the same city', async () => {
    setup((sql) => {
      if (sqlIncludes(sql, 'FROM cities') && sqlIncludes(sql, 'lower(name)')) {
        return cityRow();
      }
      if (sqlIncludes(sql, 'INSERT INTO service_areas')) {
        throw Object.assign(new Error('duplicate key'), { code: '23505' });
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    await expect(
      repo.create(adminCtx, { code: 'KIN-GOMBE', name: 'Gombe', city: 'Kinshasa' }),
    ).rejects.toThrow('Ce nom de zone existe déjà dans cette ville');
  });
});

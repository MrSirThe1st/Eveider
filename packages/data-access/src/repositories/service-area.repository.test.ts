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
    status: 'active',
    notes: null,
    created_at: new Date('2026-09-02T12:00:00.000Z'),
    updated_at: new Date('2026-09-02T12:00:00.000Z'),
    locker_count: 3,
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
        return [serviceAreaRow(), serviceAreaRow({ id: 'area-2', code: 'KWZ', name: 'Kolwezi', city: 'Kolwezi', locker_count: 1 })];
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const areas = await repo.list(adminCtx);
    expect(areas).toHaveLength(2);
    expect(areas[0]?.lockerCount).toBe(3);
    expect(areas[0]?.code).toBe('LSH');
  });

  it('creates a service area', async () => {
    setup((sql) => {
      if (sqlIncludes(sql, 'INSERT INTO service_areas')) {
        return serviceAreaRow({ code: 'KIN', name: 'Kinshasa', city: 'Kinshasa', locker_count: 0 });
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const area = await repo.create(adminCtx, {
      code: 'kin',
      name: 'Kinshasa',
      city: 'Kinshasa',
    });

    expect(area.code).toBe('KIN');
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO service_areas'),
      expect.arrayContaining(['KIN', 'Kinshasa', 'Kinshasa']),
    );
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
});

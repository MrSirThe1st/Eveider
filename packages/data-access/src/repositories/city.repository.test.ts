import { describe, expect, it } from 'vitest';
import { createDataAccessContext } from '../context.js';
import { createSqlMatchMock, sqlIncludes } from '../test/query-mock.js';
import { CityRepository } from './city.repository.js';

function cityRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'city-1',
    code: 'EVCABC123',
    name: 'Goma',
    status: 'active',
    notes: null,
    drc_city_id: 'drc-goma',
    province: 'Nord-Kivu',
    created_at: new Date('2026-09-20T12:00:00.000Z'),
    updated_at: new Date('2026-09-20T12:00:00.000Z'),
    ...overrides,
  };
}

describe('CityRepository', () => {
  const adminCtx = createDataAccessContext('admin', { userId: 'admin-1' });

  it('creates an operating city from the catalog and a holding zone', async () => {
    const db = createSqlMatchMock((sql) => {
      if (sqlIncludes(sql, 'FROM drc_cities dc') && sqlIncludes(sql, 'WHERE dc.id')) {
        return { id: 'drc-goma', name: 'Goma', province: 'Nord-Kivu' };
      }
      if (sqlIncludes(sql, 'WHERE c.drc_city_id')) {
        return null;
      }
      if (sqlIncludes(sql, 'INSERT INTO cities')) {
        return { id: 'city-goma' };
      }
      if (sqlIncludes(sql, 'FROM cities c') && sqlIncludes(sql, 'WHERE c.id')) {
        return cityRow({ id: 'city-goma' });
      }
      if (sqlIncludes(sql, 'is_holding = true')) {
        return null;
      }
      if (sqlIncludes(sql, 'INSERT INTO service_areas')) {
        return { id: 'zone-hold' };
      }
      if (sqlIncludes(sql, 'INSERT INTO zone_pricing')) {
        return { zone_id: 'zone-hold' };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const repo = new CityRepository(db);
    const city = await repo.create(adminCtx, { drcCityId: 'drc-goma' });
    expect(city.name).toBe('Goma');
    expect(city.drcCityId).toBe('drc-goma');
    expect(city.province).toBe('Nord-Kivu');
    expect(city.code).toMatch(/^EVC/);
  });

  it('reactivates an archived operating city instead of inserting a duplicate', async () => {
    const db = createSqlMatchMock((sql) => {
      if (sqlIncludes(sql, 'FROM drc_cities dc') && sqlIncludes(sql, 'WHERE dc.id')) {
        return { id: 'drc-goma', name: 'Goma', province: 'Nord-Kivu' };
      }
      if (sqlIncludes(sql, 'WHERE c.drc_city_id')) {
        return cityRow({ id: 'city-goma', status: 'archived' });
      }
      if (sqlIncludes(sql, 'FROM cities c') && sqlIncludes(sql, 'WHERE c.id')) {
        return cityRow({ id: 'city-goma', status: 'active' });
      }
      if (sqlIncludes(sql, 'UPDATE cities')) {
        return { id: 'city-goma' };
      }
      if (sqlIncludes(sql, 'is_holding = true')) {
        return { id: 'zone-hold', status: 'archived' };
      }
      if (sqlIncludes(sql, 'UPDATE service_areas')) {
        return { id: 'zone-hold' };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const repo = new CityRepository(db);
    const city = await repo.create(adminCtx, { drcCityId: 'drc-goma' });
    expect(city.status).toBe('active');
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE cities'), expect.any(Array));
    expect(db.query).not.toHaveBeenCalledWith(expect.stringContaining('INSERT INTO cities'), expect.anything());
  });

  it('refuses to archive a city that still has neighborhood zones', async () => {
    const db = createSqlMatchMock((sql) => {
      if (sqlIncludes(sql, 'FROM cities c')) {
        return cityRow({ code: 'KWZ', name: 'Kolwezi', province: 'Lualaba', drc_city_id: 'drc-kwz' });
      }
      if (sqlIncludes(sql, 'COUNT') && sqlIncludes(sql, 'is_holding = false')) {
        return { count: 2 };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const repo = new CityRepository(db);
    await expect(repo.update(adminCtx, 'city-1', { status: 'archived' })).rejects.toThrow(
      'Impossible d’archiver une ville qui a encore des zones actives',
    );
  });

  it('deletes a city with only a holding zone and no lockers', async () => {
    const db = createSqlMatchMock((sql) => {
      if (sqlIncludes(sql, 'FROM cities c')) {
        return cityRow();
      }
      if (sqlIncludes(sql, 'COUNT') && sqlIncludes(sql, 'is_holding = false')) {
        return { count: 0 };
      }
      if (sqlIncludes(sql, 'FROM lockers')) {
        return { count: 0 };
      }
      if (sqlIncludes(sql, 'DELETE FROM service_areas')) {
        return { id: 'zone-hold' };
      }
      if (sqlIncludes(sql, 'DELETE FROM cities')) {
        return { id: 'city-1' };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const repo = new CityRepository(db);
    await expect(repo.delete(adminCtx, 'city-1')).resolves.toBeUndefined();
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM service_areas'), [
      'city-1',
    ]);
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM cities'), ['city-1']);
  });

  it('refuses to delete a city that still has neighborhood zones', async () => {
    const db = createSqlMatchMock((sql) => {
      if (sqlIncludes(sql, 'FROM cities c')) {
        return cityRow();
      }
      if (sqlIncludes(sql, 'COUNT') && sqlIncludes(sql, 'is_holding = false')) {
        return { count: 1 };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const repo = new CityRepository(db);
    await expect(repo.delete(adminCtx, 'city-1')).rejects.toThrow(/supprimez d’abord ses zones/);
  });
});

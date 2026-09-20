import { describe, expect, it } from 'vitest';
import { createDataAccessContext } from '../context.js';
import { createSqlMatchMock, sqlIncludes } from '../test/query-mock.js';
import { CityRepository } from './city.repository.js';

function cityRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'city-1',
    code: 'KWZ',
    name: 'Kolwezi',
    status: 'active',
    notes: null,
    created_at: new Date('2026-09-20T12:00:00.000Z'),
    updated_at: new Date('2026-09-20T12:00:00.000Z'),
    ...overrides,
  };
}

describe('CityRepository', () => {
  const adminCtx = createDataAccessContext('admin', { userId: 'admin-1' });

  it('creates a city', async () => {
    const db = createSqlMatchMock((sql) => {
      if (sqlIncludes(sql, 'INSERT INTO cities')) {
        return cityRow({ code: 'GOM', name: 'Goma' });
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const repo = new CityRepository(db);
    const city = await repo.create(adminCtx, { code: 'gom', name: 'Goma' });
    expect(city.code).toBe('GOM');
    expect(city.name).toBe('Goma');
  });

  it('maps CITY_HAS_ACTIVE_ZONES to a French archive error', async () => {
    const db = createSqlMatchMock((sql) => {
      if (sqlIncludes(sql, 'SELECT * FROM cities')) {
        return cityRow();
      }
      if (sqlIncludes(sql, 'UPDATE cities')) {
        throw new Error('CITY_HAS_ACTIVE_ZONES');
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const repo = new CityRepository(db);
    await expect(repo.update(adminCtx, 'city-1', { status: 'archived' })).rejects.toThrow(
      'Impossible d’archiver une ville qui a encore des zones actives',
    );
  });
});

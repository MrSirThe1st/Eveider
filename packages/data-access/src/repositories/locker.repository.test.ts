import { describe, expect, it } from 'vitest';
import { createSqlMatchMock, lockerRow, sqlIncludes } from '../test/query-mock.js';
import { LockerRepository } from './locker.repository.js';

describe('LockerRepository.listActivePickerOptions', () => {
  it('selects id, name, and address without availability joins', async () => {
    const db = createSqlMatchMock((sql) => {
      if (sqlIncludes(sql, 'SELECT id, name, address') && sqlIncludes(sql, 'FROM lockers')) {
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

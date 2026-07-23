import type { ParcelStatus } from '@eveider/domain';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDataAccessContext } from '../context.js';
import {
  businessRow,
  createSqlMatchMock,
  parcelRow,
  sqlIncludes,
} from '../test/query-mock.js';
import { ParcelRepository } from './parcel.repository.js';

describe('ParcelRepository', () => {
  const findCustomerByPhone = vi.fn();
  const dispatchForNewParcel = vi.fn();
  const notifyParcelCreatedForCustomer = vi.fn();
  const notifyParcelStatusChange = vi.fn();

  let db = createSqlMatchMock(() => null);
  let repo: ParcelRepository;

  function setup(resolve: (sql: string, values?: unknown[]) => ReturnType<typeof parcelRow> | ReturnType<typeof parcelRow>[] | null) {
    db = createSqlMatchMock(resolve);
    repo = new ParcelRepository(
      db,
      { notifyParcelCreatedForCustomer, notifyParcelStatusChange } as never,
      { dispatchForNewParcel } as never,
      { findCustomerByPhone } as never,
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    findCustomerByPhone.mockResolvedValue(null);
    dispatchForNewParcel.mockResolvedValue({
      status: 'pending',
      deepLink: 'eveider://invite/token',
      webLink: 'http://localhost:3000/invite/token',
      expiresAt: new Date().toISOString(),
      acceptedAt: null,
    });
  });

  it('creates parcel for active business scope', async () => {
    setup((sql) => {
      if (sqlIncludes(sql, 'FROM businesses') && sqlIncludes(sql, 'SELECT *')) {
        return businessRow();
      }
      if (sqlIncludes(sql, 'FROM parcels WHERE tracking_number')) {
        return null;
      }
      if (sqlIncludes(sql, 'INSERT INTO parcels')) {
        return parcelRow({ locker_id: null, tracking_number: 'EVD26TEST0001A' });
      }
      if (sqlIncludes(sql, 'SELECT name FROM businesses')) {
        return { name: 'Pharmacy' };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const ctx = createDataAccessContext('business', { businessId: 'biz-1' });
    const result = await repo.create(ctx, {
      businessId: 'biz-1',
      reference: 'PK-001',
      recipientPhone: '+243000000000',
    });

    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO parcels'),
      expect.arrayContaining(['biz-1', 'PK-001', '+243000000000']),
    );
    expect(result.parcel.trackingNumber).toBeTruthy();
    expect(result.recipientStatus).toBe('invited');
    expect(dispatchForNewParcel).toHaveBeenCalled();
  });

  it('rejects parcel creation when business cannot submit', async () => {
    setup((sql) => {
      if (sqlIncludes(sql, 'FROM businesses')) {
        return businessRow({ status: 'suspended' });
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const ctx = createDataAccessContext('business', { businessId: 'biz-1' });

    await expect(
      repo.create(ctx, {
        businessId: 'biz-1',
        reference: 'PK-002',
        recipientPhone: '+243000000000',
      }),
    ).rejects.toThrow('cannot submit parcels');
  });

  it('applies domain transition on status update', async () => {
    setup((sql) => {
      if (sqlIncludes(sql, 'SELECT * FROM parcels')) {
        return parcelRow({ status: 'created', locker_id: null });
      }
      if (sqlIncludes(sql, 'UPDATE parcels SET status')) {
        return parcelRow({ status: 'in_transit', locker_id: null });
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const ctx = createDataAccessContext('courier');
    await repo.updateStatus(ctx, 'parcel-1', 'in_transit');

    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE parcels SET status'),
      ['in_transit', 'parcel-1'],
    );
    expect(notifyParcelStatusChange).toHaveBeenCalledWith('parcel-1', 'in_transit');
  });

  it('creates pickup PIN when status becomes ready_for_pickup', async () => {
    setup((sql) => {
      if (sqlIncludes(sql, 'SELECT * FROM parcels')) {
        return parcelRow({ status: 'delivered_to_locker' });
      }
      if (sqlIncludes(sql, 'UPDATE parcels SET status')) {
        return parcelRow({ status: 'ready_for_pickup' as ParcelStatus });
      }
      if (sqlIncludes(sql, 'FROM pickup_pins')) {
        return null;
      }
      if (sqlIncludes(sql, 'SELECT locker_id FROM parcels')) {
        return { locker_id: 'locker-1' };
      }
      if (sqlIncludes(sql, 'FROM pickup_pins pp') || sqlIncludes(sql, 'INNER JOIN parcels p')) {
        return null;
      }
      if (sqlIncludes(sql, 'INSERT INTO pickup_pins')) {
        return null;
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const ctx = createDataAccessContext('admin');
    await repo.updateStatus(ctx, 'parcel-1', 'ready_for_pickup');

    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO pickup_pins'),
      expect.arrayContaining(['parcel-1', expect.stringMatching(/^\d{6}$/)]),
    );
  });

  it('rejects invalid parcel transition', async () => {
    setup((sql) => {
      if (sqlIncludes(sql, 'SELECT * FROM parcels')) {
        return parcelRow({ status: 'created', locker_id: null });
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const ctx = createDataAccessContext('admin');
    await expect(repo.updateStatus(ctx, 'parcel-1', 'collected')).rejects.toThrow(
      'Invalid parcel transition',
    );
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDataAccessContext } from '../context.js';
import {
  createSqlMatchMock,
  paymentRow,
  sqlIncludes,
} from '../test/query-mock.js';
import { PaymentRepository } from './payment.repository.js';

describe('PaymentRepository', () => {
  let db = createSqlMatchMock(() => null);
  let repo: PaymentRepository;

  function setup(
    resolve: (
      sql: string,
      values?: unknown[],
    ) => Record<string, unknown> | Record<string, unknown>[] | null,
  ) {
    db = createSqlMatchMock(resolve);
    repo = new PaymentRepository(db);
  }

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PAWAPAY_API_TOKEN = 'token';
    process.env.PAWAPAY_API_BASE_URL = 'https://api.sandbox.pawapay.io';
    process.env.PAWAPAY_PICKUP_FEE_AMOUNT = '5';
    process.env.PAWAPAY_PICKUP_FEE_CURRENCY = 'USD';
  });

  it('returns pickup payment summary with configured fee', async () => {
    setup((sql) => {
      if (sqlIncludes(sql, 'FROM parcel_payments')) {
        return null;
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const summary = await repo.getPickupPaymentSummary('parcel-1');

    expect(summary).toMatchObject({
      required: true,
      status: 'none',
      amount: '5',
      currency: 'USD',
    });
  });

  it('blocks payment initiation when parcel is not ready for pickup', async () => {
    const ctx = createDataAccessContext('customer', {
      userId: 'user-1',
      phone: '+243800000000',
    });

    setup((sql) => {
      if (sqlIncludes(sql, 'FROM parcels')) {
        return {
          id: 'parcel-1',
          status: 'in_transit',
          customer_id: 'user-1',
          recipient_phone: '+243800000000',
        };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    await expect(
      repo.initiatePickupPayment(ctx, 'parcel-1', { provider: 'ORANGE_COD' }),
    ).rejects.toThrow('prêt au retrait');
  });

  it('marks payment completed from callback', async () => {
    setup((sql) => {
      if (sqlIncludes(sql, 'SELECT * FROM parcel_payments') && sqlIncludes(sql, 'deposit_id')) {
        return paymentRow({ completed_at: null, status: 'processing' });
      }
      if (sqlIncludes(sql, 'UPDATE parcel_payments')) {
        return paymentRow({ status: 'completed', completed_at: new Date() });
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const updated = await repo.applyDepositCallback({
      depositId: 'deposit-1',
      status: 'COMPLETED',
    });

    expect(updated?.status).toBe('completed');
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE parcel_payments'),
      expect.arrayContaining(['completed', 'COMPLETED']),
    );
  });
});

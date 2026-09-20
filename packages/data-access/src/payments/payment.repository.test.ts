import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDataAccessContext } from '../context.js';
import {
  createSqlMatchMock,
  paymentRow,
  sqlIncludes,
} from '../test/query-mock.js';
import { PaymentRepository } from './payment.repository.js';

vi.mock('../repositories/collection-credential.repository.js', () => ({
  CollectionCredentialRepository: class {
    reconcileForParcel = vi.fn(async () => null);
  },
}));

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
      if (sqlIncludes(sql, 'SELECT status, pickup_type, commercial_model')) {
        return {
          status: 'ready_for_pickup',
          pickup_type: 'courier_pickup',
          commercial_model: 'legacy',
          payment_responsibility: 'receiver_pays',
        };
      }
      if (sqlIncludes(sql, 'FROM parcel_charges')) {
        return null;
      }
      if (sqlIncludes(sql, 'FROM platform_settings')) {
        return { pickup_fee_amount: 5, pickup_fee_currency: 'USD' };
      }
      if (sqlIncludes(sql, 'SELECT payment_responsibility FROM parcels')) {
        return { payment_responsibility: 'receiver_pays' };
      }
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
      kind: 'pickup_fee',
    });
  });

  it('uses the canonical recipient charge instead of payment_responsibility', async () => {
    setup((sql) => {
      if (sqlIncludes(sql, 'SELECT status, pickup_type, commercial_model')) {
        return {
          status: 'ready_for_pickup',
          pickup_type: 'courier_pickup',
          commercial_model: 'canonical',
          payment_responsibility: 'sender_pays',
        };
      }
      if (sqlIncludes(sql, 'FROM parcel_charges')) {
        return {
          id: 'charge-1',
          parcel_id: 'parcel-1',
          business_id: 'biz-1',
          kind: 'outbound_delivery',
          status: 'owed',
          payer: 'recipient',
          pricing_zone_id: 'zone-1',
          amount: 1500,
          currency: 'CDF',
          unit_rate: null,
          quantity: null,
          period_started_at: null,
          period_ended_at: null,
          locked_at: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
        };
      }
      if (sqlIncludes(sql, 'FROM parcel_payments')) {
        return null;
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const summary = await repo.getPickupPaymentSummary('parcel-1');
    expect(summary).toMatchObject({
      required: true,
      amount: '1500',
      currency: 'CDF',
      kind: 'outbound_delivery',
      purpose: 'Livraison Eveider',
    });

    const paid = await repo.hasCompletedPickupPayment('parcel-1');
    expect(paid).toBe(false);
  });

  it('keeps canonical payment outstanding when PawaPay is not configured', async () => {
    delete process.env.PAWAPAY_API_TOKEN;
    setup((sql) => {
      if (sqlIncludes(sql, 'SELECT status, pickup_type, commercial_model')) {
        return {
          status: 'ready_for_pickup',
          pickup_type: 'courier_pickup',
          commercial_model: 'canonical',
          payment_responsibility: 'receiver_pays',
        };
      }
      if (sqlIncludes(sql, 'FROM parcel_charges')) {
        return {
          id: 'charge-1',
          parcel_id: 'parcel-1',
          business_id: 'biz-1',
          kind: 'outbound_delivery',
          status: 'owed',
          payer: 'recipient',
          pricing_zone_id: 'zone-1',
          amount: 1500,
          currency: 'CDF',
          unit_rate: null,
          quantity: null,
          period_started_at: null,
          period_ended_at: null,
          locked_at: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
        };
      }
      if (sqlIncludes(sql, 'FROM parcel_payments')) {
        return null;
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const summary = await repo.getPickupPaymentSummary('parcel-1');
    expect(summary.required).toBe(true);
    expect(summary.amount).toBe('1500');
    expect(summary.paymentProviderAvailable).toBe(false);
    expect(await repo.hasCompletedPickupPayment('parcel-1')).toBe(false);
  });

  it('allows a zero-amount canonical charge without PawaPay', async () => {
    delete process.env.PAWAPAY_API_TOKEN;
    setup((sql) => {
      if (sqlIncludes(sql, 'SELECT status, pickup_type, commercial_model')) {
        return {
          status: 'ready_for_pickup',
          pickup_type: 'merchant_dropoff',
          commercial_model: 'canonical',
          payment_responsibility: 'receiver_pays',
        };
      }
      if (sqlIncludes(sql, 'FROM parcel_charges')) {
        return {
          id: 'charge-1',
          parcel_id: 'parcel-1',
          business_id: 'biz-1',
          kind: 'locker_collection',
          status: 'owed',
          payer: 'recipient',
          pricing_zone_id: null,
          amount: 0,
          currency: 'CDF',
          unit_rate: null,
          quantity: null,
          period_started_at: null,
          period_ended_at: null,
          locked_at: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
        };
      }
      if (sqlIncludes(sql, 'FROM parcel_payments')) {
        return null;
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const summary = await repo.getPickupPaymentSummary('parcel-1');
    expect(summary.required).toBe(false);
    expect(await repo.hasCompletedPickupPayment('parcel-1')).toBe(true);
  });

  it('skips pickup fee when sender pays', async () => {
    setup((sql) => {
      if (sqlIncludes(sql, 'SELECT status, pickup_type, commercial_model')) {
        return {
          status: 'ready_for_pickup',
          pickup_type: 'courier_pickup',
          commercial_model: 'legacy',
          payment_responsibility: 'sender_pays',
        };
      }
      if (sqlIncludes(sql, 'FROM parcel_charges')) {
        return null;
      }
      if (sqlIncludes(sql, 'FROM platform_settings')) {
        return { pickup_fee_amount: 5, pickup_fee_currency: 'USD' };
      }
      if (sqlIncludes(sql, 'SELECT payment_responsibility FROM parcels')) {
        return { payment_responsibility: 'sender_pays' };
      }
      if (sqlIncludes(sql, 'FROM parcel_payments')) {
        return null;
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const summary = await repo.getPickupPaymentSummary('parcel-1');
    expect(summary.required).toBe(false);
    expect(summary.amount).toBeNull();
  });

  it('blocks payment initiation when parcel is not ready for pickup', async () => {
    const ctx = createDataAccessContext('customer', {
      userId: 'user-1',
      phone: '+243800000000',
    });

    setup((sql) => {
      if (sqlIncludes(sql, 'FROM platform_settings')) {
        return { pickup_fee_amount: 5, pickup_fee_currency: 'USD' };
      }
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

  it('replays a successful callback without inserting a second payment', async () => {
    let updates = 0;
    setup((sql) => {
      if (sqlIncludes(sql, 'SELECT * FROM parcel_payments') && sqlIncludes(sql, 'deposit_id')) {
        return paymentRow({ status: 'completed', completed_at: new Date() });
      }
      if (sqlIncludes(sql, 'UPDATE parcel_payments')) {
        updates += 1;
        return paymentRow({ status: 'completed', completed_at: new Date() });
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const first = await repo.applyDepositCallback({
      depositId: 'deposit-1',
      status: 'COMPLETED',
    });
    const second = await repo.applyDepositCallback({
      depositId: 'deposit-1',
      status: 'COMPLETED',
    });
    expect(first?.status).toBe('completed');
    expect(second?.status).toBe('completed');
    expect(updates).toBe(2);
    expect(
      (db.query as ReturnType<typeof vi.fn>).mock.calls.filter((call) =>
        String(call[0]).includes('INSERT INTO parcel_payments'),
      ),
    ).toHaveLength(0);
  });
});

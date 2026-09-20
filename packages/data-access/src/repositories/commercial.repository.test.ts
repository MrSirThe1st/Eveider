import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSqlMatchMock, sqlIncludes } from '../test/query-mock.js';
import { CommercialRepository } from './commercial.repository.js';

function pricingRow() {
  return {
    id: 'rule-1',
    distance_threshold_km: 10,
    below_threshold_amount: 1500,
    above_threshold_amount: 3000,
    currency: 'CDF',
    small_coefficient: 1,
    medium_coefficient: 1.5,
    large_coefficient: 2,
    drop_off_fee_amount: 500,
    locker_rental_rate_amount: 200,
    locker_collection_amount: 700,
    return_locker_amount: 400,
    updated_at: new Date('2026-01-15T12:00:00.000Z'),
    updated_by: null,
  };
}

function chargeRow(overrides: Record<string, unknown> = {}) {
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
    locked_at: new Date('2026-01-15T12:00:00.000Z'),
    created_at: new Date('2026-01-15T12:00:00.000Z'),
    updated_at: new Date('2026-01-15T12:00:00.000Z'),
    ...overrides,
  };
}

describe('CommercialRepository', () => {
  let repo: CommercialRepository;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('quotes Flow 1 from the destination locker zone, ignoring size', async () => {
    const db = createSqlMatchMock((sql) => {
      if (sqlIncludes(sql, 'FROM delivery_pricing_rules')) return pricingRow();
      if (sqlIncludes(sql, 'FROM lockers l') && sqlIncludes(sql, 'service_areas')) {
        return {
          id: 'zone-1',
          code: 'LSH',
          name: 'Lubumbashi',
          status: 'active',
          city_status: 'active',
          outbound_delivery_amount: 1500,
          return_delivery_amount: 1800,
        };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    repo = new CommercialRepository(db);

    const quote = await repo.quoteOutbound({
      pickupType: 'courier_pickup',
      lockerId: 'locker-1',
    });
    expect(quote).toMatchObject({
      kind: 'outbound_delivery',
      payer: 'recipient',
      amount: 1500,
      currency: 'CDF',
      pricingZoneId: 'zone-1',
    });
  });

  it('quotes Flow 2 as a fixed locker collection fee with no zone', async () => {
    const db = createSqlMatchMock((sql) => {
      if (sqlIncludes(sql, 'FROM delivery_pricing_rules')) return pricingRow();
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    repo = new CommercialRepository(db);

    const quote = await repo.quoteOutbound({
      pickupType: 'merchant_dropoff',
      lockerId: 'locker-1',
    });
    expect(quote).toMatchObject({
      kind: 'locker_collection',
      payer: 'recipient',
      amount: 700,
      pricingZoneId: null,
    });
    expect(db.query).not.toHaveBeenCalledWith(
      expect.stringContaining('FROM lockers l'),
      expect.anything(),
    );
  });

  it('quotes Flow 3A from the return locker zone, distinct from outbound', async () => {
    const db = createSqlMatchMock((sql) => {
      if (sqlIncludes(sql, 'FROM delivery_pricing_rules')) return pricingRow();
      if (sqlIncludes(sql, 'FROM lockers l') && sqlIncludes(sql, 'service_areas')) {
        return {
          id: 'zone-1',
          code: 'LSH',
          name: 'Lubumbashi',
          status: 'active',
          city_status: 'active',
          outbound_delivery_amount: 1500,
          return_delivery_amount: 1800,
        };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    repo = new CommercialRepository(db);

    const quote = await repo.quoteReturn({
      method: 'eveider_return',
      returnLockerId: 'locker-1',
    });
    expect(quote).toMatchObject({
      kind: 'return_delivery',
      payer: 'business',
      amount: 1800,
    });
  });

  it('quotes Flow 3B as a fixed return locker fee', async () => {
    const db = createSqlMatchMock((sql) => {
      if (sqlIncludes(sql, 'FROM delivery_pricing_rules')) return pricingRow();
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    repo = new CommercialRepository(db);

    const quote = await repo.quoteReturn({
      method: 'business_pickup',
      returnLockerId: 'locker-1',
    });
    expect(quote).toMatchObject({
      kind: 'return_locker',
      payer: 'business',
      amount: 400,
    });
  });

  it('treats a configured 0 CDF outbound price as free', async () => {
    const db = createSqlMatchMock((sql) => {
      if (sqlIncludes(sql, 'FROM delivery_pricing_rules')) return pricingRow();
      if (sqlIncludes(sql, 'FROM lockers l') && sqlIncludes(sql, 'service_areas')) {
        return {
          id: 'zone-1',
          code: 'KIN',
          name: 'Kinshasa',
          status: 'active',
          city_status: 'active',
          outbound_delivery_amount: 0,
          return_delivery_amount: 0,
        };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    repo = new CommercialRepository(db);

    const quote = await repo.quoteOutbound({
      pickupType: 'courier_pickup',
      lockerId: 'locker-1',
    });
    expect(quote.amount).toBe(0);
    expect(quote.kind).toBe('outbound_delivery');
    expect(quote.pricingZoneId).toBe('zone-1');
  });

  it('fails closed when Flow 1 zone outbound pricing is unconfigured', async () => {
    const db = createSqlMatchMock((sql) => {
      if (sqlIncludes(sql, 'FROM delivery_pricing_rules')) return pricingRow();
      if (sqlIncludes(sql, 'FROM lockers l') && sqlIncludes(sql, 'service_areas')) {
        return {
          id: 'zone-golf',
          code: 'KWZ-GOLF',
          name: 'Golf',
          status: 'active',
          city_status: 'active',
          outbound_delivery_amount: null,
          return_delivery_amount: 1500,
        };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    repo = new CommercialRepository(db);

    await expect(
      repo.quoteOutbound({ pickupType: 'courier_pickup', lockerId: 'locker-1' }),
    ).rejects.toThrow('ZONE_PRICING_NOT_CONFIGURED');
  });

  it('fails closed when Flow 3A zone return pricing is unconfigured', async () => {
    const db = createSqlMatchMock((sql) => {
      if (sqlIncludes(sql, 'FROM delivery_pricing_rules')) return pricingRow();
      if (sqlIncludes(sql, 'FROM lockers l') && sqlIncludes(sql, 'service_areas')) {
        return {
          id: 'zone-golf',
          code: 'KWZ-GOLF',
          name: 'Golf',
          status: 'active',
          city_status: 'active',
          outbound_delivery_amount: 1500,
          return_delivery_amount: null,
        };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    repo = new CommercialRepository(db);

    await expect(
      repo.quoteReturn({ method: 'eveider_return', returnLockerId: 'locker-1' }),
    ).rejects.toThrow('ZONE_PRICING_NOT_CONFIGURED');
  });

  it('rejects Flow 1 quotes from an archived zone', async () => {
    const db = createSqlMatchMock((sql) => {
      if (sqlIncludes(sql, 'FROM delivery_pricing_rules')) return pricingRow();
      if (sqlIncludes(sql, 'FROM lockers l') && sqlIncludes(sql, 'service_areas')) {
        return {
          id: 'zone-1',
          code: 'LSH',
          name: 'Lubumbashi',
          status: 'archived',
          city_status: 'active',
          outbound_delivery_amount: 1500,
          return_delivery_amount: 1800,
        };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    repo = new CommercialRepository(db);

    await expect(
      repo.quoteOutbound({ pickupType: 'courier_pickup', lockerId: 'locker-1' }),
    ).rejects.toThrow('n’est plus active');
  });

  it('rejects Flow 1 quotes from a zone whose city is archived', async () => {
    const db = createSqlMatchMock((sql) => {
      if (sqlIncludes(sql, 'FROM delivery_pricing_rules')) return pricingRow();
      if (sqlIncludes(sql, 'FROM lockers l') && sqlIncludes(sql, 'service_areas')) {
        return {
          id: 'zone-1',
          code: 'LSH',
          name: 'Lubumbashi',
          status: 'active',
          city_status: 'archived',
          outbound_delivery_amount: 1500,
          return_delivery_amount: 1800,
        };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    repo = new CommercialRepository(db);

    await expect(
      repo.quoteOutbound({ pickupType: 'courier_pickup', lockerId: 'locker-1' }),
    ).rejects.toThrow('ville n’est plus active');
  });

  it('keeps a snapshotted charge when a later quote uses a new zone price', async () => {
    const stored = chargeRow({ amount: 1500, pricing_zone_id: 'zone-1', currency: 'CDF' });
    let outboundAmount: number | null = 1500;
    const db = createSqlMatchMock((sql) => {
      if (sqlIncludes(sql, 'FROM delivery_pricing_rules')) return pricingRow();
      if (sqlIncludes(sql, 'FROM lockers l') && sqlIncludes(sql, 'service_areas')) {
        return {
          id: 'zone-1',
          code: 'LSH',
          name: 'Lubumbashi',
          status: 'active',
          city_status: 'active',
          outbound_delivery_amount: outboundAmount,
          return_delivery_amount: 1800,
        };
      }
      if (sqlIncludes(sql, 'SELECT * FROM parcel_charges')) return stored;
      if (sqlIncludes(sql, 'INSERT INTO parcel_charges')) return stored;
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    repo = new CommercialRepository(db);

    const first = await repo.quoteOutbound({
      pickupType: 'courier_pickup',
      lockerId: 'locker-1',
    });
    const charge = await repo.snapshotCharge(db, {
      parcelId: 'parcel-1',
      businessId: 'biz-1',
      kind: first.kind,
      payer: first.payer,
      amount: first.amount,
      currency: first.currency,
      pricingZoneId: first.pricingZoneId,
    });

    outboundAmount = 9999;
    const nextQuote = await repo.quoteOutbound({
      pickupType: 'courier_pickup',
      lockerId: 'locker-1',
    });
    const still = await repo.snapshotCharge(db, {
      parcelId: 'parcel-1',
      businessId: 'biz-1',
      kind: 'outbound_delivery',
      payer: 'recipient',
      amount: nextQuote.amount,
      currency: 'CDF',
      pricingZoneId: 'zone-other',
    });

    expect(charge.amount).toBe(1500);
    expect(charge.currency).toBe('CDF');
    expect(charge.pricingZoneId).toBe('zone-1');
    expect(nextQuote.amount).toBe(9999);
    expect(still.amount).toBe(1500);
    expect(still.pricingZoneId).toBe('zone-1');
    expect(db.query).not.toHaveBeenCalledWith(
      expect.stringContaining('UPDATE parcel_charges'),
      expect.anything(),
    );
  });

  it('snapshots a charge once and returns the existing row on retry', async () => {
    let inserted = false;
    const db = createSqlMatchMock((sql) => {
      if (sqlIncludes(sql, 'SELECT * FROM parcel_charges')) {
        return inserted ? chargeRow() : null;
      }
      if (sqlIncludes(sql, 'INSERT INTO parcel_charges')) {
        inserted = true;
        return chargeRow();
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    repo = new CommercialRepository(db);

    const first = await repo.snapshotCharge(db, {
      parcelId: 'parcel-1',
      businessId: 'biz-1',
      kind: 'outbound_delivery',
      payer: 'recipient',
      amount: 1500,
      currency: 'CDF',
      pricingZoneId: 'zone-1',
    });
    const second = await repo.snapshotCharge(db, {
      parcelId: 'parcel-1',
      businessId: 'biz-1',
      kind: 'outbound_delivery',
      payer: 'recipient',
      amount: 9999,
      currency: 'CDF',
      pricingZoneId: 'zone-1',
    });

    expect(first.amount).toBe(1500);
    expect(second.amount).toBe(1500);
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO parcel_charges'),
      expect.anything(),
    );
    const inserts = (db.query as ReturnType<typeof vi.fn>).mock.calls.filter((call) =>
      String(call[0]).includes('INSERT INTO parcel_charges'),
    );
    expect(inserts).toHaveLength(1);
  });

  it('fails closed for a canonical parcel missing its recipient charge', async () => {
    const db = createSqlMatchMock((sql) => {
      if (sqlIncludes(sql, 'SELECT status, pickup_type, commercial_model')) {
        return {
          status: 'ready_for_pickup',
          pickup_type: 'courier_pickup',
          commercial_model: 'canonical',
          payment_responsibility: 'receiver_pays',
        };
      }
      if (sqlIncludes(sql, 'FROM parcel_charges')) return null;
      if (sqlIncludes(sql, 'FROM parcel_payments')) return null;
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    repo = new CommercialRepository(db);

    const decision = await repo.evaluateRecipientCollection('parcel-1');
    expect(decision.code).toBe('CANONICAL_CHARGE_MISSING');
    expect(await repo.isRecipientCollectionCommerciallyAuthorized('parcel-1')).toBe(false);
  });

  it('blocks unpaid canonical collection even without a payment provider', async () => {
    const db = createSqlMatchMock((sql) => {
      if (sqlIncludes(sql, 'SELECT status, pickup_type, commercial_model')) {
        return {
          status: 'ready_for_pickup',
          pickup_type: 'courier_pickup',
          commercial_model: 'canonical',
          payment_responsibility: 'receiver_pays',
        };
      }
      if (sqlIncludes(sql, 'FROM parcel_charges')) {
        return chargeRow({ amount: 1500 });
      }
      if (sqlIncludes(sql, 'FROM parcel_payments')) return null;
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    repo = new CommercialRepository(db);
    delete process.env.PAWAPAY_API_TOKEN;

    const decision = await repo.evaluateRecipientCollection('parcel-1');
    expect(decision.authorized).toBe(false);
    expect(decision.pinAuthorized).toBe(false);
    expect(decision.code).toBe('PAYMENT_OUTSTANDING');
  });

  it('allows a zero-amount canonical charge without a payment record', async () => {
    const db = createSqlMatchMock((sql) => {
      if (sqlIncludes(sql, 'SELECT status, pickup_type, commercial_model')) {
        return {
          status: 'ready_for_pickup',
          pickup_type: 'merchant_dropoff',
          commercial_model: 'canonical',
          payment_responsibility: 'receiver_pays',
        };
      }
      if (sqlIncludes(sql, 'FROM parcel_charges')) {
        return chargeRow({ kind: 'locker_collection', amount: 0, pricing_zone_id: null });
      }
      if (sqlIncludes(sql, 'FROM parcel_payments')) return null;
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    repo = new CommercialRepository(db);
    delete process.env.PAWAPAY_API_TOKEN;

    const decision = await repo.evaluateRecipientCollection('parcel-1');
    expect(decision.authorized).toBe(true);
    expect(decision.pinAuthorized).toBe(true);
  });
});

describe('canonical quote shape', () => {
  it('does not accept parcel size — Flow 1 price is zone-only', () => {
    expect(typeof CommercialRepository.prototype.quoteOutbound).toBe('function');
    expect(CommercialRepository.prototype.quoteOutbound.length).toBe(1);
  });
});

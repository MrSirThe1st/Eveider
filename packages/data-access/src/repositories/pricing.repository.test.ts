import { describe, expect, it } from 'vitest';
import { createSqlMatchMock, sqlIncludes } from '../test/query-mock.js';
import { PricingRepository } from './pricing.repository.js';

function pricingRow(overrides: Record<string, unknown> = {}) {
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
    ...overrides,
  };
}

describe('PricingRepository', () => {
  it('overlays platform currency onto delivery rules', async () => {
    const db = createSqlMatchMock((sql) => {
      if (sqlIncludes(sql, 'FROM delivery_pricing_rules')) return pricingRow();
      if (sqlIncludes(sql, 'SELECT platform_currency FROM platform_settings')) {
        return { platform_currency: 'USD' };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const rules = await new PricingRepository(db).getDeliveryRules();
    expect(rules.currency).toBe('USD');
    expect(rules.lockerCollectionAmount).toBe(700);
  });
});

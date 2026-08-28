import { describe, expect, it } from 'vitest';
import { createSqlMatchMock, sqlIncludes } from '../test/query-mock.js';
import { BusinessOnboardingRepository } from './business-onboarding.repository.js';

const now = new Date('2026-01-15T12:00:00.000Z');

describe('BusinessOnboardingRepository page snapshots', () => {
  it('loads settings in a single query without the onboarding graph', async () => {
    const db = createSqlMatchMock((sql) => {
      if (sqlIncludes(sql, 'AS locations_json') && sqlIncludes(sql, 'FROM businesses b')) {
        return {
          name: 'Pharmacy',
          business_type: 'registered_company',
          industry: 'Santé',
          description: 'Pharmacie',
          contact_email: 'a@b.cd',
          contact_phone: '+243800000000',
          legal_company_name: 'Pharmacy SARL',
          rccm_number: 'RCCM-1',
          nif_number: 'NIF-1',
          legal_rep_name: 'Alice',
          access_code: 'EVD123',
          verification_status: null,
          verification_notes: null,
          locations_json: [
            {
              id: 'loc-1',
              business_id: 'biz-1',
              type: 'business_address',
              pickup_method: 'courier_pickup',
              country: 'RDC',
              city: 'Kinshasa',
              street: 'Gombe',
              lat: null,
              lng: null,
              contact_person: null,
              contact_phone: null,
              available_days: null,
              available_hours: null,
              dropoff_locker_id: null,
              created_at: now,
              updated_at: now,
            },
          ],
        };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const repo = new BusinessOnboardingRepository(db);
    const settings = await repo.getSettingsSnapshot('biz-1');

    expect(db.query).toHaveBeenCalledTimes(1);
    expect(settings?.name).toBe('Pharmacy');
    expect(settings?.accessCode).toBe('EVD123');
    expect(settings?.locations).toHaveLength(1);
    expect(settings?.locations[0]?.city).toBe('Kinshasa');
  });

  it('loads billing in a single joined query', async () => {
    const db = createSqlMatchMock((sql) => {
      if (sqlIncludes(sql, 'FROM businesses b') && sqlIncludes(sql, 'LEFT JOIN billing_accounts')) {
        return {
          payment_rule: 'merchant_pays',
          billing_type: 'pay_per_shipment',
          payout_method: 'mobile_money_orange',
          account_holder: 'Alice',
          account_number: '0890000000',
          daily_shipments: 50,
          cod_daily_limit_usd: 200,
        };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const repo = new BusinessOnboardingRepository(db);
    const billing = await repo.getBillingSnapshot('biz-1');

    expect(db.query).toHaveBeenCalledTimes(1);
    expect(billing).toEqual({
      paymentRule: 'merchant_pays',
      billingType: 'pay_per_shipment',
      payoutMethod: 'mobile_money_orange',
      accountHolder: 'Alice',
      accountNumber: '0890000000',
      dailyShipments: 50,
      codDailyLimitUsd: 200,
    });
  });

  it('returns null when the business does not exist', async () => {
    const db = createSqlMatchMock(() => null);
    const repo = new BusinessOnboardingRepository(db);
    await expect(repo.getSettingsSnapshot('missing')).resolves.toBeNull();
    await expect(repo.getBillingSnapshot('missing')).resolves.toBeNull();
  });
});

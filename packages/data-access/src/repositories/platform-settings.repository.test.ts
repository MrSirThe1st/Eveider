import { describe, expect, it } from 'vitest';
import { createDataAccessContext } from '../context.js';
import { createQueryMock, createSqlMatchMock, sqlIncludes } from '../test/query-mock.js';
import {
  PlatformSettingsRepository,
  readPlatformCurrency,
} from './platform-settings.repository.js';

function settingsRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'settings-1',
    pickup_fee_amount: 5,
    pickup_fee_currency: 'USD',
    platform_currency: 'CDF',
    require_org_approval: false,
    default_daily_shipments: 50,
    default_monthly_shipments: 1000,
    default_max_package_value_usd: 500,
    default_cod_daily_limit_usd: 200,
    default_enabled_features: ['CREATE_SHIPMENT'],
    support_phone: null,
    dispatcher_whatsapp: null,
    updated_at: new Date('2026-01-15T12:00:00.000Z'),
    updated_by: null,
    ...overrides,
  };
}

describe('readPlatformCurrency', () => {
  it('reads USD from platform_settings', async () => {
    const db = createSqlMatchMock((sql) => {
      if (sqlIncludes(sql, 'SELECT platform_currency FROM platform_settings')) {
        return { platform_currency: 'USD' };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    await expect(readPlatformCurrency(db)).resolves.toBe('USD');
  });

  it('defaults to CDF when unset', async () => {
    const db = createSqlMatchMock(() => null);
    await expect(readPlatformCurrency(db)).resolves.toBe('CDF');
  });
});

describe('PlatformSettingsRepository', () => {
  it('exposes a single platformCurrency and aliases pickupFeeCurrency to it', async () => {
    const db = createSqlMatchMock((sql) => {
      if (sqlIncludes(sql, 'FROM platform_settings')) return settingsRow();
      throw new Error(`Unexpected SQL: ${sql}`);
    });
    const row = await new PlatformSettingsRepository(db).getSettings();
    expect(row.platformCurrency).toBe('CDF');
    expect(row.pickupFeeCurrency).toBe('CDF');
  });

  it('persists the platform currency and syncs delivery_pricing_rules', async () => {
    const updated = settingsRow({ platform_currency: 'USD', pickup_fee_currency: 'USD' });
    const db = createQueryMock([
      () => settingsRow(),
      () => updated,
      (sql) => {
        if (!sqlIncludes(sql, 'UPDATE delivery_pricing_rules')) {
          throw new Error(`Unexpected SQL: ${sql}`);
        }
        return null;
      },
    ]);
    const repo = new PlatformSettingsRepository(db);
    const row = await repo.updateSettings(createDataAccessContext('admin', { userId: 'admin-1' }), {
      pickupFeeAmount: 5,
      platformCurrency: 'USD',
      requireOrgApproval: false,
      defaultDailyShipments: 50,
      defaultMonthlyShipments: 1000,
      defaultMaxPackageValueUsd: 500,
      defaultCodDailyLimitUsd: 200,
      defaultEnabledFeatures: ['CREATE_SHIPMENT'],
    });

    expect(row.platformCurrency).toBe('USD');
    expect(row.pickupFeeCurrency).toBe('USD');
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('platform_currency = $2'),
      expect.arrayContaining(['USD']),
    );
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE delivery_pricing_rules'),
      ['USD'],
    );
  });
});

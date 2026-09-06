import { assertAdmin, type DataAccessContext } from '../context.js';
import type { Queryable } from '../db/index.js';

export const PLATFORM_DEFAULT_FEATURES = [
  'CREATE_SHIPMENT',
  'API_ACCESS',
  'COD',
  'MONTHLY_INVOICE',
] as const;

export type PlatformDefaultFeature = (typeof PLATFORM_DEFAULT_FEATURES)[number];

export type PlatformSettingsRow = {
  id: string;
  pickupFeeAmount: number;
  pickupFeeCurrency: string;
  requireOrgApproval: boolean;
  defaultDailyShipments: number | null;
  defaultMonthlyShipments: number | null;
  defaultMaxPackageValueUsd: number | null;
  defaultCodDailyLimitUsd: number | null;
  defaultEnabledFeatures: PlatformDefaultFeature[];
  supportPhone: string | null;
  dispatcherWhatsapp: string | null;
  updatedAt: Date;
  updatedBy: string | null;
};

export type UpdatePlatformSettingsInput = {
  pickupFeeAmount: number;
  pickupFeeCurrency: string;
  requireOrgApproval: boolean;
  defaultDailyShipments: number | null;
  defaultMonthlyShipments: number | null;
  defaultMaxPackageValueUsd: number | null;
  defaultCodDailyLimitUsd: number | null;
  defaultEnabledFeatures: PlatformDefaultFeature[];
  supportPhone?: string | null;
  dispatcherWhatsapp?: string | null;
};

function parseFeatures(raw: unknown): PlatformDefaultFeature[] {
  const value = typeof raw === 'string' ? (JSON.parse(raw) as unknown) : raw;
  if (!Array.isArray(value)) return [...PLATFORM_DEFAULT_FEATURES];
  const allowed = new Set<string>(PLATFORM_DEFAULT_FEATURES);
  const features = value.filter((item): item is PlatformDefaultFeature =>
    typeof item === 'string' && allowed.has(item),
  );
  return features.length > 0 ? features : [...PLATFORM_DEFAULT_FEATURES];
}

function asNullableNumber(value: unknown): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function mapRow(row: Record<string, unknown>): PlatformSettingsRow {
  return {
    id: String(row.id),
    pickupFeeAmount: Number(row.pickup_fee_amount),
    pickupFeeCurrency: String(row.pickup_fee_currency),
    requireOrgApproval: Boolean(row.require_org_approval),
    defaultDailyShipments: asNullableNumber(row.default_daily_shipments),
    defaultMonthlyShipments: asNullableNumber(row.default_monthly_shipments),
    defaultMaxPackageValueUsd: asNullableNumber(row.default_max_package_value_usd),
    defaultCodDailyLimitUsd: asNullableNumber(row.default_cod_daily_limit_usd),
    defaultEnabledFeatures: parseFeatures(row.default_enabled_features),
    supportPhone: row.support_phone == null ? null : String(row.support_phone),
    dispatcherWhatsapp:
      row.dispatcher_whatsapp == null ? null : String(row.dispatcher_whatsapp),
    updatedAt: new Date(String(row.updated_at)),
    updatedBy: row.updated_by == null ? null : String(row.updated_by),
  };
}

export class PlatformSettingsRepository {
  constructor(private readonly db: Queryable) {}

  async getSettings(): Promise<PlatformSettingsRow> {
    const result = await this.db.query(
      `SELECT * FROM platform_settings ORDER BY updated_at DESC LIMIT 1`,
    );
    const row = result.rows[0];
    if (!row) {
      throw new Error('Paramètres plateforme introuvables');
    }
    return mapRow(row);
  }

  async updateSettings(
    ctx: DataAccessContext,
    input: UpdatePlatformSettingsInput,
  ): Promise<PlatformSettingsRow> {
    assertAdmin(ctx);
    const current = await this.getSettings();
    const result = await this.db.query(
      `UPDATE platform_settings
       SET pickup_fee_amount = $1,
           pickup_fee_currency = $2,
           require_org_approval = $3,
           default_daily_shipments = $4,
           default_monthly_shipments = $5,
           default_max_package_value_usd = $6,
           default_cod_daily_limit_usd = $7,
           default_enabled_features = $8::jsonb,
           support_phone = $9,
           dispatcher_whatsapp = $10,
           updated_at = NOW(),
           updated_by = $11
       WHERE id = $12
       RETURNING *`,
      [
        input.pickupFeeAmount,
        input.pickupFeeCurrency,
        input.requireOrgApproval,
        input.defaultDailyShipments,
        input.defaultMonthlyShipments,
        input.defaultMaxPackageValueUsd,
        input.defaultCodDailyLimitUsd,
        JSON.stringify(input.defaultEnabledFeatures),
        input.supportPhone?.trim() || null,
        input.dispatcherWhatsapp?.trim() || null,
        ctx.userId ?? null,
        current.id,
      ],
    );
    return mapRow(result.rows[0]!);
  }
}

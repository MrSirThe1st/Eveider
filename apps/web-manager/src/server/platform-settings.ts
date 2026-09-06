import { createRepositories } from '@eveider/data-access';
import type { PlatformDefaultFeature } from '@eveider/data-access';

export type PlatformSettingsDto = {
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
  updatedAt: string;
  pawapayConfigured: boolean;
};

export async function getPlatformSettings(): Promise<PlatformSettingsDto> {
  const { platformSettings } = createRepositories();
  const row = await platformSettings.getSettings();
  return {
    id: row.id,
    pickupFeeAmount: row.pickupFeeAmount,
    pickupFeeCurrency: row.pickupFeeCurrency,
    requireOrgApproval: row.requireOrgApproval,
    defaultDailyShipments: row.defaultDailyShipments,
    defaultMonthlyShipments: row.defaultMonthlyShipments,
    defaultMaxPackageValueUsd: row.defaultMaxPackageValueUsd,
    defaultCodDailyLimitUsd: row.defaultCodDailyLimitUsd,
    defaultEnabledFeatures: row.defaultEnabledFeatures,
    supportPhone: row.supportPhone,
    dispatcherWhatsapp: row.dispatcherWhatsapp,
    updatedAt: row.updatedAt.toISOString(),
    pawapayConfigured: Boolean(process.env.PAWAPAY_API_TOKEN?.trim()),
  };
}

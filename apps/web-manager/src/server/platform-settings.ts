import { createRepositories } from '@eveider/data-access';
import type { PlatformDefaultFeature } from '@eveider/data-access';
import type { DeliveryPricingCurrency } from '@eveider/domain';

export type PlatformSettingsDto = {
  id: string;
  pickupFeeAmount: number;
  pickupFeeCurrency: DeliveryPricingCurrency;
  platformCurrency: DeliveryPricingCurrency;
  requireOrgApproval: boolean;
  defaultDailyShipments: number | null;
  defaultMonthlyShipments: number | null;
  defaultMaxPackageValueUsd: number | null;
  defaultCodDailyLimitUsd: number | null;
  defaultEnabledFeatures: PlatformDefaultFeature[];
  supportPhone: string | null;
  dispatcherWhatsapp: string | null;
  driverSelfAssignmentEnabled: boolean;
  updatedAt: string;
  pawapayConfigured: boolean;
};

export async function getPlatformSettings(): Promise<PlatformSettingsDto> {
  const { platformSettings } = createRepositories();
  const row = await platformSettings.getSettings();
  return {
    id: row.id,
    pickupFeeAmount: row.pickupFeeAmount,
    pickupFeeCurrency: row.platformCurrency,
    platformCurrency: row.platformCurrency,
    requireOrgApproval: row.requireOrgApproval,
    defaultDailyShipments: row.defaultDailyShipments,
    defaultMonthlyShipments: row.defaultMonthlyShipments,
    defaultMaxPackageValueUsd: row.defaultMaxPackageValueUsd,
    defaultCodDailyLimitUsd: row.defaultCodDailyLimitUsd,
    defaultEnabledFeatures: row.defaultEnabledFeatures,
    supportPhone: row.supportPhone,
    dispatcherWhatsapp: row.dispatcherWhatsapp,
    driverSelfAssignmentEnabled: row.driverSelfAssignmentEnabled,
    updatedAt: row.updatedAt.toISOString(),
    pawapayConfigured: Boolean(process.env.PAWAPAY_API_TOKEN?.trim()),
  };
}

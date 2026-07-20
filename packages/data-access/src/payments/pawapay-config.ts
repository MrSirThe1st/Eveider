export type PawaPayConfig = {
  apiToken: string;
  baseUrl: string;
  country: string;
  pickupFeeAmount: string;
  pickupFeeCurrency: string;
};

export const DRC_DEPOSIT_PROVIDERS = [
  { id: 'ORANGE_COD', label: 'Orange Money' },
  { id: 'AIRTEL_COD', label: 'Airtel Money' },
  { id: 'VODACOM_MPESA_COD', label: 'Vodacom M-Pesa' },
] as const;

export type DrcDepositProvider = (typeof DRC_DEPOSIT_PROVIDERS)[number]['id'];

export function getPawaPayConfig(): PawaPayConfig | null {
  const apiToken = process.env.PAWAPAY_API_TOKEN?.trim();
  const baseUrl = (process.env.PAWAPAY_API_BASE_URL?.trim() || 'https://api.sandbox.pawapay.io').replace(
    /\/$/,
    '',
  );
  if (!apiToken) return null;

  return {
    apiToken,
    baseUrl,
    country: process.env.PAWAPAY_DEFAULT_COUNTRY?.trim() || 'COD',
    pickupFeeAmount: process.env.PAWAPAY_PICKUP_FEE_AMOUNT?.trim() || '5',
    pickupFeeCurrency: process.env.PAWAPAY_PICKUP_FEE_CURRENCY?.trim() || 'USD',
  };
}

/** PawaPay expects MSISDN digits only (country code, no +). */
export function normalizePawaPayPhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

export function isDrcDepositProvider(value: string): value is DrcDepositProvider {
  return DRC_DEPOSIT_PROVIDERS.some((provider) => provider.id === value);
}

export const APP_COUNTRY_CODES = ['CD'] as const;

export type AppCountry = (typeof APP_COUNTRY_CODES)[number];

export const APP_COUNTRIES: readonly { code: AppCountry }[] = APP_COUNTRY_CODES.map((code) => ({
  code,
}));

export const DEFAULT_COUNTRY: AppCountry = 'CD';

export function isAppCountry(value: unknown): value is AppCountry {
  return APP_COUNTRY_CODES.some((code) => code === value);
}

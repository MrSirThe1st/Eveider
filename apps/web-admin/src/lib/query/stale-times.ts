/** How long fetched data is considered fresh before a background refetch. */
export const STALE_TIMES = {
  parcels: 60_000,
  dashboard: 60_000,
  deliveries: 30_000,
  lockers: 60_000,
  businesses: 60_000,
  couriers: 60_000,
  issues: 60_000,
  users: 60_000,
  applications: 60_000,
  settings: 5 * 60_000,
} as const;

/** Auto-refresh interval for live boards (livraisons). */
export const REFRESH_INTERVALS = {
  deliveries: 30_000,
} as const;

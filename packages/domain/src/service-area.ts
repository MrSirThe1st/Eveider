export type ServiceAreaStatus = 'active' | 'archived';

export const SERVICE_AREA_STATUSES: readonly ServiceAreaStatus[] = ['active', 'archived'] as const;

export function isServiceAreaStatus(value: unknown): value is ServiceAreaStatus {
  return typeof value === 'string' && (SERVICE_AREA_STATUSES as readonly string[]).includes(value);
}

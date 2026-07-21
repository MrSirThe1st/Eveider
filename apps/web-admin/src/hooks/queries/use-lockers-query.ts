/**
 * Query keys for lockers — list reads use Server Components.
 * Keys remain for live board seeding and detail mutation invalidation.
 */
export type { LockerSummaryDto as LockerListItem } from '@/lib/locker-presenter';

export function lockersQueryKey() {
  return ['lockers'] as const;
}

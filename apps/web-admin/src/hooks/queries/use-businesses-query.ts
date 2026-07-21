/**
 * Query keys for businesses — list reads use Server Components.
 * Keys remain for live board seeding and related mutation invalidation.
 */
export type { BusinessListItem } from '@/server/businesses';

export function businessesQueryKey() {
  return ['businesses'] as const;
}

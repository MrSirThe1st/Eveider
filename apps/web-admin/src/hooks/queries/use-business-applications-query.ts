/**
 * Query keys for business applications.
 * List reads use Server Components — this key is for mutation cache invalidation only.
 */
export type {
  BusinessApplicationDetail,
  BusinessApplicationItem,
} from '@/server/business-applications';

export function businessApplicationsQueryKey() {
  return ['business-applications'] as const;
}

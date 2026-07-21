/**
 * Issue types — list reads use Server Components; status chips filter in memory.
 */
export type { IssueItem, IssueStatusFilter } from '@/server/issues';

export function issuesQueryKey(status: string = 'all') {
  return ['issues', { status }] as const;
}

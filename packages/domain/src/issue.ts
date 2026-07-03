export type IssueType =
  | 'failed_delivery'
  | 'locker_unavailable'
  | 'parcel_problem'
  | 'locker_system';

export type IssueStatus = 'open' | 'in_progress' | 'resolved';

export const ISSUE_TYPES: readonly IssueType[] = [
  'failed_delivery',
  'locker_unavailable',
  'parcel_problem',
  'locker_system',
] as const;

export const ISSUE_STATUSES: readonly IssueStatus[] = ['open', 'in_progress', 'resolved'] as const;

const ISSUE_TRANSITIONS: Record<IssueStatus, readonly IssueStatus[]> = {
  open: ['in_progress', 'resolved'],
  in_progress: ['resolved', 'open'],
  resolved: [],
};

export function canTransitionIssue(from: IssueStatus, to: IssueStatus): boolean {
  return ISSUE_TRANSITIONS[from].includes(to);
}

export function transitionIssue(from: IssueStatus, to: IssueStatus): IssueStatus {
  if (!canTransitionIssue(from, to)) {
    throw new Error(`Invalid issue transition: ${from} → ${to}`);
  }
  return to;
}

import { ISSUE_STATUS_LABELS, ISSUE_TYPE_LABELS } from '@eveider/domain';
import type { IssueWithRelations } from '@eveider/data-access';

export function toIssueDto(issue: IssueWithRelations) {
  return {
    id: issue.id,
    type: issue.type,
    typeLabel: ISSUE_TYPE_LABELS[issue.type],
    status: issue.status,
    statusLabel: ISSUE_STATUS_LABELS[issue.status],
    description: issue.description,
    parcelId: issue.parcelId,
    parcelReference: issue.parcel?.reference ?? null,
    lockerId: issue.lockerId,
    lockerName: issue.locker?.name ?? null,
    reporterId: issue.reporter.id,
    reporterName: issue.reporter.fullName ?? issue.reporter.email,
    reporterRole: issue.reporter.role,
    createdAt: issue.createdAt.toISOString(),
    updatedAt: issue.updatedAt.toISOString(),
  };
}

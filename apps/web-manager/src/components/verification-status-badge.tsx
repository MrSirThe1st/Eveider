import { ORGANIZATION_VERIFICATION_LABELS, type OrganizationVerificationStatus } from '@eveider/domain';
import { StatusBadge, type StatusBadgeTone } from '@eveider/ui';

type VerificationStatusBadgeProps = {
  status: OrganizationVerificationStatus;
};

const TONE: Record<OrganizationVerificationStatus, StatusBadgeTone> = {
  approved: 'success',
  pending: 'warning',
  correction_requested: 'warning',
  rejected: 'danger',
  not_started: 'neutral',
};

export function VerificationStatusBadge({ status }: VerificationStatusBadgeProps) {
  return (
    <StatusBadge tone={TONE[status] ?? 'neutral'}>
      {ORGANIZATION_VERIFICATION_LABELS[status]}
    </StatusBadge>
  );
}

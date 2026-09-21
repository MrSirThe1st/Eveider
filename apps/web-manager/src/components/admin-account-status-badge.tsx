import { ADMIN_ACCOUNT_STATUS_LABELS, type AdminAccountStatus } from '@eveider/domain';
import { StatusBadge, type StatusBadgeTone } from '@eveider/ui';

type AdminAccountStatusBadgeProps = {
  status: AdminAccountStatus;
};

const TONE: Record<AdminAccountStatus, StatusBadgeTone> = {
  active: 'success',
  suspended: 'neutral',
};

export function AdminAccountStatusBadge({ status }: AdminAccountStatusBadgeProps) {
  return (
    <StatusBadge tone={TONE[status] ?? 'neutral'}>
      {ADMIN_ACCOUNT_STATUS_LABELS[status]}
    </StatusBadge>
  );
}

import { LOCKER_STATUS_LABELS, type LockerStatus } from '@eveider/domain';
import { StatusBadge, type StatusBadgeTone } from '@eveider/ui';

type LockerStatusBadgeProps = {
  status: LockerStatus;
};

const TONE: Record<LockerStatus, StatusBadgeTone> = {
  active: 'success',
  offline: 'neutral',
  full: 'warning',
  archived: 'neutral',
};

export function LockerStatusBadge({ status }: LockerStatusBadgeProps) {
  return (
    <StatusBadge tone={TONE[status] ?? 'neutral'}>
      {LOCKER_STATUS_LABELS[status]}
    </StatusBadge>
  );
}

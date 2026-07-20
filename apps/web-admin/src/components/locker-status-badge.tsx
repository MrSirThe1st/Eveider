import { colors, radius } from '@eveider/config-ui';
import { LOCKER_STATUS_LABELS, type LockerStatus } from '@eveider/domain';

const STATUS_COLORS: Record<LockerStatus, string> = {
  active: colors.primary,
  offline: colors.secondary,
  full: colors.danger,
  archived: colors.border,
};

type LockerStatusBadgeProps = {
  status: LockerStatus;
};

export function LockerStatusBadge({ status }: LockerStatusBadgeProps) {
  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: '0.6875rem',
        fontWeight: 600,
        letterSpacing: '0.06em',
        padding: '0.35rem 0.6rem',
        borderRadius: radius.button,
        border: `2px solid ${colors.border}`,
        color: STATUS_COLORS[status],
      }}
    >
      {LOCKER_STATUS_LABELS[status]}
    </span>
  );
}

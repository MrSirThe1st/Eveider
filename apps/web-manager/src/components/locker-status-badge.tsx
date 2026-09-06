import { colors } from '@eveider/config-ui';
import { LOCKER_STATUS_LABELS, type LockerStatus } from '@eveider/domain';

type LockerStatusBadgeProps = {
  status: LockerStatus;
};

const STATUS_STYLES: Record<
  LockerStatus,
  { bg: string; color: string; dot: string; border: string }
> = {
  active: {
    bg: colors.successMuted,
    color: colors.successFg,
    dot: colors.success,
    border: colors.primaryMuted,
  },
  offline: {
    bg: colors.surfaceMuted,
    color: colors.textMuted,
    dot: colors.textDisabled,
    border: colors.border,
  },
  full: {
    bg: colors.warningMuted,
    color: colors.warningFg,
    dot: colors.warning,
    border: colors.warningMuted,
  },
  archived: {
    bg: colors.surfaceMuted,
    color: colors.textMuted,
    dot: colors.textDisabled,
    border: colors.border,
  },
};

export function LockerStatusBadge({ status }: LockerStatusBadgeProps) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.offline;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.375rem',
        fontSize: '0.75rem',
        fontWeight: 600,
        padding: '0.25rem 0.65rem',
        borderRadius: 999,
        border: `1px solid ${style.border}`,
        background: style.bg,
        color: style.color,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: style.dot,
        }}
      />
      {LOCKER_STATUS_LABELS[status]}
    </span>
  );
}

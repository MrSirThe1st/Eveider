import { LOCKER_STATUS_LABELS, type LockerStatus } from '@eveider/domain';

type LockerStatusBadgeProps = {
  status: LockerStatus;
};

const STATUS_STYLES: Record<
  LockerStatus,
  { bg: string; color: string; dot: string; border: string }
> = {
  active: {
    bg: '#DCF5D6',
    color: '#067A07',
    dot: '#09D40B',
    border: '#C0EAB7',
  },
  offline: {
    bg: '#F0F4EE',
    color: '#475467',
    dot: '#98A2B3',
    border: '#E2E8E0',
  },
  full: {
    bg: '#FFFBEB',
    color: '#B45309',
    dot: '#F59E0B',
    border: '#FDE68A',
  },
  archived: {
    bg: '#F0F4EE',
    color: '#475467',
    dot: '#98A2B3',
    border: '#E2E8E0',
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


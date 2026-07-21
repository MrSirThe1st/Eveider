import { PARCEL_STATUS_LABELS, type ParcelStatus } from '@eveider/domain';

type ParcelStatusBadgeProps = {
  status: ParcelStatus;
};

const STATUS_STYLES: Record<
  ParcelStatus,
  { bg: string; color: string; dot: string; border: string }
> = {
  ready_for_pickup: {
    bg: '#DCF5D6',
    color: '#067A07',
    dot: '#09D40B',
    border: '#C0EAB7',
  },
  delivered_to_locker: {
    bg: '#DCF5D6',
    color: '#067A07',
    dot: '#09D40B',
    border: '#C0EAB7',
  },
  in_transit: {
    bg: '#FFE4EC',
    color: '#D92D20',
    dot: '#FF6B8B',
    border: '#FFCCD8',
  },
  created: {
    bg: '#F0F4EE',
    color: '#475467',
    dot: '#98A2B3',
    border: '#E2E8E0',
  },
  collected: {
    bg: '#F0F4EE',
    color: '#475467',
    dot: '#98A2B3',
    border: '#E2E8E0',
  },
};

export function ParcelStatusBadge({ status }: ParcelStatusBadgeProps) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.created;

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
      {PARCEL_STATUS_LABELS[status]}
    </span>
  );
}


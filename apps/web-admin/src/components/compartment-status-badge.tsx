import { COMPARTMENT_STATUS_LABELS, type CompartmentStatus } from '@eveider/domain';

type CompartmentStatusBadgeProps = {
  status: CompartmentStatus;
};

const STATUS_STYLES: Record<
  CompartmentStatus,
  { bg: string; color: string; dot: string; border: string }
> = {
  available: {
    bg: '#DCF5D6',
    color: '#067A07',
    dot: '#09D40B',
    border: '#C0EAB7',
  },
  occupied: {
    bg: '#FFE4EC',
    color: '#D92D20',
    dot: '#FF6B8B',
    border: '#FFCCD8',
  },
  reserved: {
    bg: '#EBF3FE',
    color: '#1677FF',
    dot: '#1677FF',
    border: '#D2E3FC',
  },
};

export function CompartmentStatusBadge({ status }: CompartmentStatusBadgeProps) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.available;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        fontSize: '0.72rem',
        fontWeight: 600,
        padding: '0.2rem 0.55rem',
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
      {COMPARTMENT_STATUS_LABELS[status]}
    </span>
  );
}


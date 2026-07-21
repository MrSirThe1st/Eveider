import { BUSINESS_STATUS_LABELS, type BusinessStatus } from '@eveider/domain';

type BusinessStatusBadgeProps = {
  status: BusinessStatus;
};

const STATUS_STYLES: Record<
  BusinessStatus,
  { bg: string; color: string; dot: string; border: string }
> = {
  active: {
    bg: '#DCF5D6',
    color: '#067A07',
    dot: '#09D40B',
    border: '#C0EAB7',
  },
  onboarding: {
    bg: '#EBF3FE',
    color: '#1677FF',
    dot: '#1677FF',
    border: '#D2E3FC',
  },
  pending_review: {
    bg: '#FFFBEB',
    color: '#B45309',
    dot: '#F59E0B',
    border: '#FDE68A',
  },
  pending_correction: {
    bg: '#FFFBEB',
    color: '#B45309',
    dot: '#F59E0B',
    border: '#FDE68A',
  },
  pending: {
    bg: '#FFFBEB',
    color: '#B45309',
    dot: '#F59E0B',
    border: '#FDE68A',
  },
  draft: {
    bg: '#F0F4EE',
    color: '#475467',
    dot: '#98A2B3',
    border: '#E2E8E0',
  },
  suspended: {
    bg: '#F0F4EE',
    color: '#475467',
    dot: '#98A2B3',
    border: '#E2E8E0',
  },
  blocked: {
    bg: '#FEF2F2',
    color: '#E53935',
    dot: '#E53935',
    border: '#FCA5A5',
  },
};

export function BusinessStatusBadge({ status }: BusinessStatusBadgeProps) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.draft;

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
      {BUSINESS_STATUS_LABELS[status]}
    </span>
  );
}


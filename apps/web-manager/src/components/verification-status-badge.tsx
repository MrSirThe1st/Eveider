import { ORGANIZATION_VERIFICATION_LABELS, type OrganizationVerificationStatus } from '@eveider/domain';

type VerificationStatusBadgeProps = {
  status: OrganizationVerificationStatus;
};

const STATUS_STYLES: Record<
  OrganizationVerificationStatus,
  { bg: string; color: string; dot: string; border: string }
> = {
  approved: {
    bg: '#DCF5D6',
    color: '#067A07',
    dot: '#09D40B',
    border: '#C0EAB7',
  },
  pending: {
    bg: '#FFFBEB',
    color: '#B45309',
    dot: '#F59E0B',
    border: '#FDE68A',
  },
  correction_requested: {
    bg: '#FFFBEB',
    color: '#B45309',
    dot: '#F59E0B',
    border: '#FDE68A',
  },
  rejected: {
    bg: '#FEF2F2',
    color: '#E53935',
    dot: '#E53935',
    border: '#FCA5A5',
  },
  not_started: {
    bg: '#F0F4EE',
    color: '#475467',
    dot: '#98A2B3',
    border: '#E2E8E0',
  },
};

export function VerificationStatusBadge({ status }: VerificationStatusBadgeProps) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.not_started;

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
      {ORGANIZATION_VERIFICATION_LABELS[status]}
    </span>
  );
}

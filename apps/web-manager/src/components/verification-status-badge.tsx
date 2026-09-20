import { colors } from '@eveider/config-ui';
import { ORGANIZATION_VERIFICATION_LABELS, type OrganizationVerificationStatus } from '@eveider/domain';

type VerificationStatusBadgeProps = {
  status: OrganizationVerificationStatus;
};

const STATUS_STYLES: Record<
  OrganizationVerificationStatus,
  { bg: string; color: string; dot: string; border: string }
> = {
  approved: {
    bg: colors.successMuted,
    color: colors.successFg,
    dot: colors.success,
    border: colors.primaryMuted,
  },
  pending: {
    bg: colors.warningMuted,
    color: colors.warningFg,
    dot: colors.warning,
    border: colors.warningMuted,
  },
  correction_requested: {
    bg: colors.warningMuted,
    color: colors.warningFg,
    dot: colors.warning,
    border: colors.warningMuted,
  },
  rejected: {
    bg: colors.dangerMuted,
    color: colors.dangerFg,
    dot: colors.danger,
    border: colors.dangerMuted,
  },
  not_started: {
    bg: colors.surfaceMuted,
    color: colors.textMuted,
    dot: colors.textDisabled,
    border: colors.borderSubtle,
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

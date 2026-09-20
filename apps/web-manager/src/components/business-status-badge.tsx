import { colors } from '@eveider/config-ui';
import { BUSINESS_STATUS_LABELS, type BusinessStatus } from '@eveider/domain';

type BusinessStatusBadgeProps = {
  status: BusinessStatus;
};

const STATUS_STYLES: Record<
  BusinessStatus,
  { bg: string; color: string; dot: string; border: string }
> = {
  active: {
    bg: colors.successMuted,
    color: colors.successFg,
    dot: colors.success,
    border: colors.primaryMuted,
  },
  onboarding: {
    bg: colors.infoMuted,
    color: colors.infoFg,
    dot: colors.info,
    border: colors.infoMuted,
  },
  pending_review: {
    bg: colors.warningMuted,
    color: colors.warningFg,
    dot: colors.warning,
    border: colors.warningMuted,
  },
  pending_correction: {
    bg: colors.warningMuted,
    color: colors.warningFg,
    dot: colors.warning,
    border: colors.warningMuted,
  },
  pending: {
    bg: colors.warningMuted,
    color: colors.warningFg,
    dot: colors.warning,
    border: colors.warningMuted,
  },
  draft: {
    bg: colors.surfaceMuted,
    color: colors.textMuted,
    dot: colors.textDisabled,
    border: colors.borderSubtle,
  },
  suspended: {
    bg: colors.surfaceMuted,
    color: colors.textMuted,
    dot: colors.textDisabled,
    border: colors.borderSubtle,
  },
  blocked: {
    bg: colors.dangerMuted,
    color: colors.dangerFg,
    dot: colors.danger,
    border: colors.dangerMuted,
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


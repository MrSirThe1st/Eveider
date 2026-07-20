import { colors, radius } from '@eveider/config-ui';
import { BUSINESS_STATUS_LABELS, type BusinessStatus } from '@eveider/domain';

const STATUS_COLORS: Record<BusinessStatus, string> = {
  pending: colors.info,
  active: colors.primary,
  suspended: colors.secondary,
  blocked: colors.danger,
};

type BusinessStatusBadgeProps = {
  status: BusinessStatus;
};

export function BusinessStatusBadge({ status }: BusinessStatusBadgeProps) {
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
      {BUSINESS_STATUS_LABELS[status]}
    </span>
  );
}

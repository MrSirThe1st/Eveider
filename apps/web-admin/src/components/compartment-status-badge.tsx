import { colors, radius } from '@eveider/config-ui';
import { COMPARTMENT_STATUS_LABELS, type CompartmentStatus } from '@eveider/domain';

const STATUS_COLORS: Record<CompartmentStatus, string> = {
  available: colors.primary,
  occupied: colors.danger,
  reserved: colors.info,
};

type CompartmentStatusBadgeProps = {
  status: CompartmentStatus;
};

export function CompartmentStatusBadge({ status }: CompartmentStatusBadgeProps) {
  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: '0.625rem',
        fontWeight: 600,
        letterSpacing: '0.06em',
        padding: '0.3rem 0.5rem',
        borderRadius: radius.button,
        border: `1px solid ${colors.border}`,
        color: STATUS_COLORS[status],
      }}
    >
      {COMPARTMENT_STATUS_LABELS[status]}
    </span>
  );
}

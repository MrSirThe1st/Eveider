import { colors, radius } from '@eveider/config-ui';
import { DELIVERY_STATUS_LABELS, type DeliveryStatus } from '@eveider/domain';

const STATUS_COLORS: Record<DeliveryStatus, string> = {
  assigned: colors.secondary,
  scanned: colors.info,
  drop_off_pending: '#B45309',
  completed: colors.primary,
  failed: colors.danger,
};

type DeliveryStatusBadgeProps = {
  status: DeliveryStatus;
};

export function DeliveryStatusBadge({ status }: DeliveryStatusBadgeProps) {
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
      {DELIVERY_STATUS_LABELS[status]}
    </span>
  );
}

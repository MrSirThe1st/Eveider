import { colors, radius } from '@eveider/config-ui';
import { PARCEL_STATUS_LABELS, type ParcelStatus } from '@eveider/domain';

const STATUS_COLORS: Record<ParcelStatus, string> = {
  created: colors.secondary,
  in_transit: colors.info,
  delivered_to_locker: colors.info,
  ready_for_pickup: colors.primary,
  collected: colors.primary,
};

type ParcelStatusBadgeProps = {
  status: ParcelStatus;
};

export function ParcelStatusBadge({ status }: ParcelStatusBadgeProps) {
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
      {PARCEL_STATUS_LABELS[status]}
    </span>
  );
}

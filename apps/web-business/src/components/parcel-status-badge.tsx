import { colors, radius, borders, PARCEL_STATUS_FILLS } from '@eveider/config-ui';
import { PARCEL_STATUS_LABELS, type ParcelStatus } from '@eveider/domain';

type ParcelStatusBadgeProps = {
  status: ParcelStatus;
};

export function ParcelStatusBadge({ status }: ParcelStatusBadgeProps) {
  const fill = PARCEL_STATUS_FILLS[status];

  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: '0.625rem',
        fontWeight: 700,
        letterSpacing: '0.08em',
        padding: '0.35rem 0.65rem',
        borderRadius: radius.badge,
        border: `${borders.width}px solid ${colors.border}`,
        background: fill,
        color: colors.secondary,
        textTransform: 'uppercase',
      }}
    >
      {PARCEL_STATUS_LABELS[status]}
    </span>
  );
}

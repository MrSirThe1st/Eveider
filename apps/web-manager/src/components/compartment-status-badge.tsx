import { colors } from '@eveider/config-ui';
import { COMPARTMENT_STATUS_LABELS, type CompartmentStatus } from '@eveider/domain';

type CompartmentStatusBadgeProps = {
  status: CompartmentStatus;
};

const STATUS_COLOR: Record<CompartmentStatus, string> = {
  available: colors.successFg,
  occupied: colors.dangerFg,
  reserved: colors.infoFg,
};

/** Plain status label — no pill chrome. */
export function CompartmentStatusBadge({ status }: CompartmentStatusBadgeProps) {
  return (
    <p
      style={{
        margin: 0,
        fontSize: '0.875rem',
        fontWeight: 600,
        color: STATUS_COLOR[status] ?? colors.secondary,
      }}
    >
      {COMPARTMENT_STATUS_LABELS[status]}
    </p>
  );
}

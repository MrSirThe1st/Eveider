import { colors } from '@eveider/config-ui';
import { BUSINESS_PARCEL_LOCATION_LABELS, type BusinessParcelLocation } from '@eveider/domain';

type BusinessParcelLocationBadgeProps = {
  location: BusinessParcelLocation;
};

const NEUTRAL = {
  bg: colors.surfaceMuted,
  color: colors.textMuted,
  dot: colors.textDisabled,
  border: colors.borderSubtle,
};
const LAVENDER = {
  bg: colors.infoMuted,
  color: colors.infoFg,
  dot: colors.info,
  border: colors.infoMuted,
};
const PEACH = {
  bg: colors.warningMuted,
  color: colors.warningFg,
  dot: colors.warning,
  border: colors.warningMuted,
};
const SAGE = {
  bg: colors.successMuted,
  color: colors.successFg,
  dot: colors.success,
  border: colors.primaryMuted,
};

const LOCATION_STYLES: Record<
  BusinessParcelLocation,
  { bg: string; color: string; dot: string; border: string }
> = {
  awaiting_courier: NEUTRAL,
  awaiting_dropoff: NEUTRAL,
  courier_assigned: LAVENDER,
  in_transit: LAVENDER,
  at_locker: PEACH,
  ready_for_pickup: SAGE,
  return_in_progress: LAVENDER,
  returned_to_business: NEUTRAL,
  collected: NEUTRAL,
  customer_return_requested: LAVENDER,
  customer_return_authorized: LAVENDER,
  customer_return_at_locker: PEACH,
  customer_return_in_transit: LAVENDER,
  customer_return_completed: NEUTRAL,
};

export function BusinessParcelLocationBadge({ location }: BusinessParcelLocationBadgeProps) {
  const style = LOCATION_STYLES[location];

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
        letterSpacing: '0.01em',
      }}
    >
      <span
        aria-hidden
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: style.dot,
        }}
      />
      {BUSINESS_PARCEL_LOCATION_LABELS[location]}
    </span>
  );
}

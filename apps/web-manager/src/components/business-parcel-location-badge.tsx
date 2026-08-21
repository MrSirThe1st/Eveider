import { BUSINESS_PARCEL_LOCATION_LABELS, type BusinessParcelLocation } from '@eveider/domain';

type BusinessParcelLocationBadgeProps = {
  location: BusinessParcelLocation;
};

const LOCATION_STYLES: Record<
  BusinessParcelLocation,
  { bg: string; color: string; dot: string; border: string }
> = {
  awaiting_courier: {
    bg: '#F0F4EE',
    color: '#475467',
    dot: '#98A2B3',
    border: '#E2E8E0',
  },
  awaiting_dropoff: {
    bg: '#F0F4EE',
    color: '#475467',
    dot: '#98A2B3',
    border: '#E2E8E0',
  },
  courier_assigned: {
    bg: '#E8F1FB',
    color: '#175CD3',
    dot: '#2E90FA',
    border: '#B2DDFF',
  },
  in_transit: {
    bg: '#FFE4EC',
    color: '#D92D20',
    dot: '#FF6B8B',
    border: '#FFCCD8',
  },
  at_locker: {
    bg: '#FFF3D6',
    color: '#B54708',
    dot: '#F79009',
    border: '#FEDF89',
  },
  ready_for_pickup: {
    bg: '#DCF5D6',
    color: '#067A07',
    dot: '#09D40B',
    border: '#C0EAB7',
  },
  collected: {
    bg: '#F0F4EE',
    color: '#475467',
    dot: '#98A2B3',
    border: '#E2E8E0',
  },
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

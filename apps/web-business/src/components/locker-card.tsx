'use client';

import { colors, radius } from '@eveider/config-ui';

export type LockerOption = {
  id: string;
  name: string;
  address: string;
  availableCompartments: number;
  latitude?: number | null;
  longitude?: number | null;
};

type LockerCardProps = {
  locker: LockerOption;
  selected: boolean;
  onSelect: (lockerId: string) => void;
};

export function LockerCard({ locker, selected, onSelect }: LockerCardProps) {
  const isFull = locker.availableCompartments === 0;

  // Let's assume a total of 3 compartments for visualization
  const totalSlots = 3;
  const freeSlots = locker.availableCompartments;
  const occupiedSlots = Math.max(0, totalSlots - freeSlots);

  // Status-based colors and labels
  let statusText = 'DISPONIBLE';
  let statusColor: string = colors.success;
  let statusBg = 'rgba(9, 212, 11, 0.1)';

  if (freeSlots === 1) {
    statusText = '1 COMPARTIMENT RESTANT';
    statusColor = colors.warning;
    statusBg = 'rgba(255, 184, 0, 0.1)';
  } else if (isFull) {
    statusText = 'COMPLET';
    statusColor = colors.danger;
    statusBg = 'rgba(229, 57, 53, 0.1)';
  } else {
    statusText = `${freeSlots} COMPARTIMENTS LIBRES`;
  }

  return (
    <div
      onClick={() => {
        if (!isFull) onSelect(locker.id);
      }}
      style={{
        background: isFull ? colors.background : colors.surface,
        border: selected
          ? `2px solid ${colors.secondary}`
          : `1px solid ${colors.border}`,
        borderRadius: radius.card,
        padding: '1.25rem',
        cursor: isFull ? 'not-allowed' : 'pointer',
        opacity: isFull ? 0.6 : 1,
        transition: 'all 0.15s ease-in-out',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        boxShadow: selected ? '0 4px 12px rgba(18, 18, 18, 0.08)' : 'none',
      }}
    >
      {/* Selected Indicator */}
      {selected && (
        <div
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            width: 20,
            height: 20,
            borderRadius: '50%',
            backgroundColor: colors.secondary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      )}

      <div>
        <h4
          style={{
            margin: 0,
            fontSize: '0.875rem',
            fontWeight: 700,
            letterSpacing: '0.04em',
            color: colors.secondary,
            paddingRight: selected ? '1.5rem' : 0,
          }}
        >
          {locker.name.toUpperCase()}
        </h4>
        <p
          style={{
            margin: '0.25rem 0 0',
            fontSize: '0.8125rem',
            fontWeight: 500,
            color: colors.secondary,
            opacity: 0.8,
            lineHeight: '1.25rem',
          }}
        >
          {locker.address}
        </p>
      </div>

      {/* Availability Indicators */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 'auto',
          paddingTop: '0.75rem',
          borderTop: `1px solid ${colors.border}`,
          gap: '1rem',
        }}
      >
        <span
          style={{
            fontSize: '0.6875rem',
            fontWeight: 700,
            letterSpacing: '0.05em',
            color: statusColor,
            backgroundColor: statusBg,
            padding: '3px 8px',
            borderRadius: '4px',
          }}
        >
          {statusText}
        </span>

        {/* Visual Slots representation */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {Array.from({ length: freeSlots }).map((_, i) => (
            <div
              key={`free-${i}`}
              style={{
                width: 10,
                height: 10,
                borderRadius: '2px',
                backgroundColor: colors.success,
              }}
              title="Disponible"
            />
          ))}
          {Array.from({ length: occupiedSlots }).map((_, i) => (
            <div
              key={`occ-${i}`}
              style={{
                width: 10,
                height: 10,
                borderRadius: '2px',
                backgroundColor: isFull ? colors.danger : '#CCCCCC',
              }}
              title="Occupé"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

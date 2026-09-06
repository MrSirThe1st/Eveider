'use client';

import { colors } from '@eveider/config-ui';
import { compartmentSizeLabel, type CompartmentSize } from '@eveider/domain';
import type { CompartmentStatus } from '@eveider/domain';

export type CabinetCompartment = {
  id: string;
  label: string;
  size: CompartmentSize;
  status: CompartmentStatus;
};

type LockerCompartmentCabinetProps = {
  rows: number;
  columns: number;
  compartments: CabinetCompartment[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

/** Cell fill + legend indicator — keep both in sync so meaning matches color. */
const STATUS_STYLE: Record<
  CompartmentStatus,
  { background: string; color: string; indicator: string }
> = {
  available: {
    background: colors.primary,
    color: colors.onPrimary,
    indicator: colors.primary,
  },
  occupied: {
    background: '#FF99B2',
    color: '#121212',
    indicator: '#E53935',
  },
  reserved: {
    background: colors.surfaceMuted,
    color: colors.secondary,
    indicator: colors.info,
  },
};

export function LockerCompartmentCabinet({
  rows,
  columns,
  compartments,
  selectedId,
  onSelect,
}: LockerCompartmentCabinetProps) {
  const byLabel = new Map(compartments.map((c) => [c.label, c]));

  const grid: (CabinetCompartment | null)[][] = [];
  for (let row = 0; row < rows; row++) {
    const rowLetter = String.fromCharCode(65 + row);
    const rowCells: (CabinetCompartment | null)[] = [];
    for (let col = 1; col <= columns; col++) {
      rowCells.push(byLabel.get(`${rowLetter}${col}`) ?? null);
    }
    grid.push(rowCells);
  }

  const cellMin = rows >= 4 || columns >= 4 ? 56 : 72;

  return (
    <div>
      <div
        style={{
          display: 'grid',
          gap: 8,
          gridTemplateColumns: `repeat(${columns}, minmax(${cellMin}px, 1fr))`,
        }}
      >
        {grid.flat().map((compartment, index) => {
          if (!compartment) {
            return (
              <div
                key={`empty-${index}`}
                style={{
                  minHeight: cellMin,
                  borderRadius: 6,
                  background: colors.background,
                }}
              />
            );
          }

          const visual = STATUS_STYLE[compartment.status];
          const isSelected = compartment.id === selectedId;

          return (
            <button
              key={compartment.id}
              type="button"
              className="cabinet-cell"
              onClick={() => onSelect(compartment.id)}
              title={`${compartment.label} — ${
                compartment.status === 'available'
                  ? 'Disponible'
                  : compartment.status === 'occupied'
                    ? 'Occupé'
                    : 'Réservé'
              }`}
              style={{
                minHeight: cellMin,
                borderRadius: 10,
                border: isSelected ? `2px solid ${colors.primary}` : `1px solid ${colors.borderSubtle}`,
                outline: 'none',
                background: visual.background,
                color: visual.color,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                padding: '0.35rem',
                position: 'relative',
                boxShadow: isSelected ? `0 0 0 2px ${colors.primaryMuted}` : undefined,
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  top: 6,
                  right: 6,
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: visual.indicator,
                  border:
                    compartment.status === 'available'
                      ? `1.5px solid ${colors.onPrimary}`
                      : `1px solid ${colors.borderSubtle}`,
                  boxSizing: 'border-box',
                }}
              />
              <span
                style={{
                  fontSize: '1rem',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  lineHeight: 1,
                }}
              >
                {compartment.label}
              </span>
              {compartment.size !== 'medium' ? (
                <span
                  style={{
                    fontSize: '0.625rem',
                    fontWeight: 700,
                    opacity: 0.75,
                  }}
                >
                  {compartmentSizeLabel(compartment.size)}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <CabinetLegend />
    </div>
  );
}

function CabinetLegend() {
  const items: { label: string; color: string }[] = [
    { label: 'Disponible', color: STATUS_STYLE.available.indicator },
    { label: 'Occupé', color: STATUS_STYLE.occupied.indicator },
    { label: 'Réservé', color: STATUS_STYLE.reserved.indicator },
  ];

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1rem',
        marginTop: '1rem',
      }}
    >
      {items.map((item) => (
        <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: item.color,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              color: colors.textMuted,
            }}
          >
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}

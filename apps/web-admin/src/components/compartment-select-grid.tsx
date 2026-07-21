'use client';

import { colors } from '@eveider/config-ui';
import {
  COMPARTMENT_SIZE_FULL_LABELS,
  compartmentSizeLabel,
  type CompartmentSize,
  type CompartmentStatus,
} from '@eveider/domain';

export type SelectableCompartment = {
  id: string;
  label: string;
  size: CompartmentSize;
  status: CompartmentStatus;
  selectable: boolean;
};

type CompartmentSelectGridProps = {
  rows: number;
  columns: number;
  compartments: SelectableCompartment[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

const STATUS_STYLE: Record<
  CompartmentStatus,
  { background: string; color: string; opacity: number }
> = {
  available: { background: '#09D40B', color: '#FFFFFF', opacity: 1 },
  occupied: { background: '#FF99B2', color: '#121212', opacity: 0.85 },
  reserved: { background: '#475467', color: '#FFFFFF', opacity: 0.85 },
};

export function CompartmentSelectGrid({
  rows,
  columns,
  compartments,
  selectedId,
  onSelect,
}: CompartmentSelectGridProps) {
  const byLabel = new Map(compartments.map((c) => [c.label, c]));
  const cellMin = rows >= 4 || columns >= 4 ? 52 : 64;

  const grid: (SelectableCompartment | null)[][] = [];
  for (let row = 0; row < rows; row++) {
    const rowLetter = String.fromCharCode(65 + row);
    const rowCells: (SelectableCompartment | null)[] = [];
    for (let col = 1; col <= columns; col++) {
      rowCells.push(byLabel.get(`${rowLetter}${col}`) ?? null);
    }
    grid.push(rowCells);
  }

  return (
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
                borderRadius: 10,
                background: colors.background,
              }}
            />
          );
        }

        const visual = STATUS_STYLE[compartment.status];
        const isSelected = compartment.id === selectedId;
        const canSelect = compartment.selectable;

        return (
          <button
            key={compartment.id}
            type="button"
            disabled={!canSelect}
            onClick={() => onSelect(compartment.id)}
            title={`${compartment.label} — ${COMPARTMENT_SIZE_FULL_LABELS[compartment.size]}`}
            style={{
              minHeight: cellMin,
              borderRadius: 10,
              border: 'none',
              outline: isSelected ? '3px solid #09D40B' : 'none',
              outlineOffset: 2,
              background: visual.background,
              color: visual.color,
              opacity: canSelect ? visual.opacity : visual.opacity,
              cursor: canSelect ? 'pointer' : 'not-allowed',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              padding: '0.35rem',
            }}
          >
            <span style={{ fontSize: '0.9375rem', fontWeight: 700, letterSpacing: '0.06em' }}>
              {compartment.label}
            </span>
            <span style={{ fontSize: '0.625rem', fontWeight: 700, opacity: 0.8 }}>
              {compartmentSizeLabel(compartment.size)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function SizeLegendChip({ label, count }: { label: string; count: number }) {
  if (count === 0) return null;
  return (
    <span
      style={{
        fontSize: '0.6875rem',
        fontWeight: 700,
        letterSpacing: '0.05em',
        padding: '0.2rem 0.5rem',
        borderRadius: 4,
        background: colors.background,
      }}
    >
      {label} ×{count}
    </span>
  );
}

export function LockerSizeSummary({
  availableBySize,
}: {
  availableBySize: { small: number; medium: number; large: number };
}) {
  const hasAny =
    availableBySize.small > 0 || availableBySize.medium > 0 || availableBySize.large > 0;

  if (!hasAny) {
    return (
      <span style={{ fontSize: '0.6875rem', fontWeight: 600, opacity: 0.55 }}>Complet</span>
    );
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
      <SizeLegendChip label="S" count={availableBySize.small} />
      <SizeLegendChip label="M" count={availableBySize.medium} />
      <SizeLegendChip label="L" count={availableBySize.large} />
    </div>
  );
}

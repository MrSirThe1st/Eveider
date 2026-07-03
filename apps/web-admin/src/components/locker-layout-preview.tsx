'use client';

import { colors } from '@eveider/config-ui';
import {
  cellsToGrid,
  compartmentSizeLabel,
  COMPARTMENT_SIZE_FULL_LABELS,
  lockerCapacity,
  resolveLockerLayout,
  type CompartmentCell,
  type CompartmentSize,
  type LockerLayoutPreset,
  type ResolvedLockerLayout,
} from '@eveider/domain';

type LockerLayoutPreviewProps = {
  layout: ResolvedLockerLayout;
  compact?: boolean;
  interactive?: boolean;
  onCellClick?: (label: string) => void;
};

const SIZE_COLORS: Record<CompartmentSize, string> = {
  small: '#E8F5E9',
  medium: '#FFFFFF',
  large: '#FFF8E1',
};

export function LockerLayoutPreview({
  layout,
  compact = false,
  interactive = false,
  onCellClick,
}: LockerLayoutPreviewProps) {
  const grid = cellsToGrid(layout);
  const cellSize = compact ? 28 : 36;
  const gap = compact ? 4 : 6;

  return (
    <div>
      <div
        style={{
          display: 'grid',
          gap,
          gridTemplateColumns: `repeat(${layout.columns}, ${cellSize}px)`,
          justifyContent: 'start',
        }}
      >
        {grid.flat().map((cell, index) => (
          <button
            key={`${cell.label}-${index}`}
            type="button"
            disabled={!interactive}
            title={
              interactive
                ? `${cell.label} — ${COMPARTMENT_SIZE_FULL_LABELS[cell.size]} (cliquer pour changer)`
                : `${cell.label} (${COMPARTMENT_SIZE_FULL_LABELS[cell.size]})`
            }
            onClick={() => onCellClick?.(cell.label)}
            style={{
              width: cellSize,
              height: cellSize,
              border: `2px solid ${colors.border}`,
              borderRadius: 6,
              background: SIZE_COLORS[cell.size],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: compact ? 9 : 10,
              fontWeight: 700,
              color: colors.secondary,
              padding: 0,
              cursor: interactive ? 'pointer' : 'default',
            }}
          >
            {interactive || cell.size !== 'medium' ? compartmentSizeLabel(cell.size) : ''}
          </button>
        ))}
      </div>
      <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', fontWeight: 600, color: colors.primary }}>
        {layout.rows} × {layout.columns} — {lockerCapacity(layout)} compartiment
        {lockerCapacity(layout) > 1 ? 's' : ''}
      </p>
    </div>
  );
}

export function useLockerLayout(
  preset: LockerLayoutPreset,
  customRows: number,
  customColumns: number,
  cells?: CompartmentCell[],
): ResolvedLockerLayout {
  return resolveLockerLayout(
    preset,
    preset === 'custom' ? customRows : undefined,
    preset === 'custom' ? customColumns : undefined,
    cells,
  );
}

export const LAYOUT_PRESET_LABELS: Record<LockerLayoutPreset, string> = {
  '3x3': '3×3',
  '4x4': '4×4',
  custom: 'Perso.',
};

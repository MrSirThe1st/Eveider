export type CompartmentSize = 'small' | 'medium' | 'large';

export type LockerLayoutPreset = '3x3' | '4x4' | 'custom';

export type CompartmentCell = {
  label: string;
  size: CompartmentSize;
};

export type ResolvedLockerLayout = {
  preset: LockerLayoutPreset;
  rows: number;
  columns: number;
  cells: CompartmentCell[];
};

export const LOCKER_LAYOUT_PRESETS: readonly LockerLayoutPreset[] = [
  '3x3',
  '4x4',
  'custom',
] as const;

export const COMPARTMENT_SIZES: readonly CompartmentSize[] = ['small', 'medium', 'large'] as const;

const COMPARTMENT_SIZE_LABELS: Record<CompartmentSize, string> = {
  small: 'S',
  medium: 'M',
  large: 'L',
};

export const COMPARTMENT_SIZE_FULL_LABELS: Record<CompartmentSize, string> = {
  small: 'Petit',
  medium: 'Moyen',
  large: 'Grand',
};

export function compartmentSizeLabel(size: CompartmentSize): string {
  return COMPARTMENT_SIZE_LABELS[size];
}

export function cycleCompartmentSize(size: CompartmentSize): CompartmentSize {
  if (size === 'small') return 'medium';
  if (size === 'medium') return 'large';
  return 'small';
}

export function buildUniformLayout(
  rows: number,
  columns: number,
  size: CompartmentSize = 'medium',
): ResolvedLockerLayout {
  const cells: CompartmentCell[] = [];
  for (let row = 0; row < rows; row++) {
    const rowLetter = String.fromCharCode(65 + row);
    for (let col = 1; col <= columns; col++) {
      cells.push({ label: `${rowLetter}${col}`, size });
    }
  }

  return {
    preset: 'custom',
    rows,
    columns,
    cells,
  };
}

export function resizeLayoutCells(
  rows: number,
  columns: number,
  previous: CompartmentCell[],
): CompartmentCell[] {
  const sizeByLabel = new Map(previous.map((cell) => [cell.label, cell.size]));
  return buildUniformLayout(rows, columns).cells.map((cell) => ({
    ...cell,
    size: sizeByLabel.get(cell.label) ?? 'medium',
  }));
}

export function resolveLockerLayout(
  preset: LockerLayoutPreset,
  customRows?: number,
  customColumns?: number,
  cells?: CompartmentCell[],
): ResolvedLockerLayout {
  const rows =
    preset === '3x3' ? 3 : preset === '4x4' ? 4 : Math.min(12, Math.max(1, customRows ?? 3));
  const columns =
    preset === '3x3' ? 3 : preset === '4x4' ? 4 : Math.min(12, Math.max(1, customColumns ?? 3));

  const normalizedCells =
    cells && cells.length > 0
      ? resizeLayoutCells(rows, columns, cells)
      : buildUniformLayout(rows, columns).cells;

  return { preset, rows, columns, cells: normalizedCells };
}

export function lockerCapacity(layout: ResolvedLockerLayout): number {
  return layout.cells.length;
}

/** @deprecated City-prefix codes replaced by global EVP codes — kept for tests/migration. */
export function deriveLockerCodePrefix(locationHint: string): string {
  const normalized = locationHint.trim().toLowerCase();
  if (!normalized) return 'EVE';

  const parts = normalized.split(',').map((part) => part.trim());
  const cityToken = (parts[parts.length - 1] ?? normalized)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)[0];

  if (!cityToken) return 'EVE';

  const letters = cityToken.replace(/[^a-z]/g, '').toUpperCase();
  if (letters.length >= 3) return letters.slice(0, 3);
  if (letters.length > 0) return letters.padEnd(3, 'X');
  return 'EVE';
}

/** @deprecated Prefer generatePointCode() from identifiers. */
export function formatLockerCode(prefix: string, sequence: number): string {
  const safePrefix = prefix.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4) || 'EVE';
  return `${safePrefix}-${String(sequence).padStart(3, '0')}`;
}

export function suggestLockerName(address: string): string {
  const parts = address
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) return '';

  if (parts.length >= 2) {
    return `${parts[0]} Point`;
  }

  return `${parts[0]} Centre`;
}

export function cellsToGrid(layout: ResolvedLockerLayout): CompartmentCell[][] {
  const grid: CompartmentCell[][] = [];

  for (let row = 0; row < layout.rows; row++) {
    const rowLetter = String.fromCharCode(65 + row);
    const rowCells: CompartmentCell[] = [];
    for (let col = 0; col < layout.columns; col++) {
      const label = `${rowLetter}${col + 1}`;
      const index = row * layout.columns + col;
      rowCells.push(layout.cells[index] ?? { label, size: 'medium' });
    }
    grid.push(rowCells);
  }

  return grid;
}

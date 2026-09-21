export type SortDirection = 'asc' | 'desc';

export type DataTableSortState = {
  id: string | null;
  direction: SortDirection;
};

export const DEFAULT_TABLE_PAGE_SIZE = 10;
export const DEFAULT_TABLE_PAGE_SIZE_OPTIONS = [10, 15, 20] as const;

export type PaginationItem = number | 'ellipsis';

export type RowActionKind = 'link' | 'button';

export type ResolvedRowAction = {
  id: string;
  label: string;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  tone?: 'default' | 'danger';
};

export type ResolvedRowActions = {
  visible: ResolvedRowAction[];
  overflow: ResolvedRowAction[];
};

export function compareValues(
  a: string | number | null | undefined,
  b: string | number | null | undefined,
  direction: SortDirection,
): number {
  const empty = direction === 'asc' ? 1 : -1;
  if (a == null && b == null) return 0;
  if (a == null) return empty;
  if (b == null) return -empty;

  if (typeof a === 'number' && typeof b === 'number') {
    return direction === 'asc' ? a - b : b - a;
  }

  const left = String(a).localeCompare(String(b), 'fr', { sensitivity: 'base', numeric: true });
  return direction === 'asc' ? left : -left;
}

/** Cycle unsorted → asc → desc → unsorted. */
export function nextSortState(
  current: DataTableSortState,
  columnId: string,
  allowUnsorted = true,
): DataTableSortState {
  if (current.id !== columnId) {
    return { id: columnId, direction: 'asc' };
  }
  if (current.direction === 'asc') {
    return { id: columnId, direction: 'desc' };
  }
  if (allowUnsorted) {
    return { id: null, direction: 'asc' };
  }
  return { id: columnId, direction: 'asc' };
}

export function slicePage<T>(rows: T[], page: number, pageSize: number): T[] {
  if (pageSize <= 0) return rows;
  const start = page * pageSize;
  return rows.slice(start, start + pageSize);
}

export function pageCountFor(rowCount: number, pageSize: number): number {
  if (pageSize <= 0) return 1;
  return Math.max(1, Math.ceil(rowCount / pageSize));
}

export function pageRangeLabel(page: number, pageSize: number, rowCount: number): string {
  if (rowCount === 0) return `0 sur 0`;
  const start = page * pageSize + 1;
  const end = Math.min(rowCount, (page + 1) * pageSize);
  return `${start}–${end} sur ${rowCount}`;
}

/**
 * Compact page list: first, last, current ± neighbors, with ellipses.
 * `page` is 0-based; returned numbers are 0-based page indexes.
 */
export function paginationItems(page: number, pageCount: number, siblingCount = 1): PaginationItem[] {
  if (pageCount <= 1) return pageCount === 1 ? [0] : [];
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => index);
  }

  const first = 0;
  const last = pageCount - 1;
  const start = Math.max(first + 1, page - siblingCount);
  const end = Math.min(last - 1, page + siblingCount);
  const items: PaginationItem[] = [first];

  if (start > first + 1) items.push('ellipsis');
  for (let index = start; index <= end; index += 1) items.push(index);
  if (end < last - 1) items.push('ellipsis');
  items.push(last);

  return items;
}

export function shouldShowJumpTo(pageCount: number): boolean {
  return pageCount > 6;
}

/**
 * 1 action → visible.
 * 2 actions → both visible.
 * 3+ → keep an optional primary visible and put the rest in overflow.
 */
export function resolveRowActions(
  primary: ResolvedRowAction | null,
  extras: ResolvedRowAction[],
): ResolvedRowActions {
  const all = primary ? [primary, ...extras] : extras;
  if (all.length === 0) return { visible: [], overflow: [] };
  if (all.length <= 2) return { visible: all, overflow: [] };
  if (primary) return { visible: [primary], overflow: extras };
  return { visible: [], overflow: all };
}

export function toggleId(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id];
}

export function mergeSelection(current: string[], visibleIds: string[], selected: boolean): string[] {
  if (selected) {
    const next = new Set(current);
    for (const id of visibleIds) next.add(id);
    return [...next];
  }
  const drop = new Set(visibleIds);
  return current.filter((id) => !drop.has(id));
}

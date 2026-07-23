'use client';

import { colors, radius, spacing, typography, borderSubtle } from '@eveider/config-ui';
import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { DropdownMenu, type DropdownMenuItem } from './dropdown-menu.js';
import { EmptyState } from './empty-state.js';
import { IconChevronDown, IconChevronUp } from './icons.js';

export type SortDirection = 'asc' | 'desc';

export type DataTableColumn<T> = {
  id: string;
  header: string;
  /** Cell renderer. */
  cell: (row: T) => ReactNode;
  /** Enable header sort control. */
  sortable?: boolean;
  /** Value used for sorting (required when sortable). */
  sortValue?: (row: T) => string | number | null | undefined;
  align?: 'left' | 'right';
  width?: string | number;
  hideOnMobile?: boolean;
};

export type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  /** Optional row action menu items. */
  rowActions?: (row: T) => DropdownMenuItem[];
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  /** Caption above the table (e.g. "12 colis"). */
  caption?: string;
  className?: string;
  style?: CSSProperties;
  /** Initial sort column id. */
  initialSortId?: string;
  initialSortDirection?: SortDirection;
};

function compareValues(
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

/**
 * Enterprise data table: sortable headers, status-friendly cells, row actions, empty state.
 */
export function DataTable<T>({
  columns,
  rows,
  getRowId,
  rowActions,
  emptyTitle = 'Aucun élément',
  emptyDescription,
  emptyAction,
  caption,
  className,
  style,
  initialSortId,
  initialSortDirection = 'asc',
}: DataTableProps<T>) {
  const [sortId, setSortId] = useState<string | null>(initialSortId ?? null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(initialSortDirection);

  const sortedRows = useMemo(() => {
    if (!sortId) return rows;
    const column = columns.find((col) => col.id === sortId);
    if (!column?.sortable || !column.sortValue) return rows;

    return [...rows].sort((left, right) =>
      compareValues(column.sortValue!(left), column.sortValue!(right), sortDirection),
    );
  }, [columns, rows, sortDirection, sortId]);

  function toggleSort(column: DataTableColumn<T>) {
    if (!column.sortable) return;
    if (sortId === column.id) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortId(column.id);
    setSortDirection('asc');
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
        compact
      />
    );
  }

  const showActions = Boolean(rowActions);

  return (
    <div className={['nb-data-table', className].filter(Boolean).join(' ')} style={style}>
      {caption ? (
        <p
          style={{
            margin: `0 0 ${spacing[3]}px`,
            fontSize: typography.caption.fontSize,
            fontWeight: typography.weights.semibold,
            color: colors.textMuted,
          }}
        >
          {caption}
        </p>
      ) : null}

      <div
        className="nb-data-table__scroll"
        style={{
          overflowX: 'auto',
          border: borderSubtle(),
          borderRadius: radius.card,
          background: colors.surface,
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)',
        }}
      >
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            minWidth: 640,
          }}
        >
          <thead>
            <tr style={{ background: colors.surfaceMuted }}>
              {columns.map((column) => {
                const active = sortId === column.id;
                const align = column.align ?? 'left';
                return (
                  <th
                    key={column.id}
                    scope="col"
                    className={column.hideOnMobile ? 'nb-data-table__hide-mobile' : undefined}
                    style={{
                      padding: `${spacing[3]}px ${spacing[4]}px`,
                      textAlign: align,
                      fontSize: typography.caption.fontSize,
                      fontWeight: typography.weights.semibold,
                      color: colors.textMuted,
                      borderBottom: borderSubtle(),
                      whiteSpace: 'nowrap',
                      width: column.width,
                    }}
                  >
                    {column.sortable ? (
                      <button
                        type="button"
                        className="nb-data-table__sort"
                        onClick={() => toggleSort(column)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: spacing[1],
                          margin: 0,
                          padding: `${spacing[1]}px ${spacing[1]}px`,
                          border: 'none',
                          background: 'transparent',
                          color: active ? colors.secondary : colors.textMuted,
                          font: 'inherit',
                          fontWeight: typography.weights.semibold,
                          cursor: 'pointer',
                        }}
                        aria-sort={
                          active ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'
                        }
                      >
                        {column.header}
                        <span aria-hidden style={{ display: 'inline-flex', opacity: active ? 1 : 0.35 }}>
                          {active && sortDirection === 'desc' ? (
                            <IconChevronDown width={14} height={14} />
                          ) : (
                            <IconChevronUp width={14} height={14} />
                          )}
                        </span>
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
              {showActions ? (
                <th
                  scope="col"
                  style={{
                    padding: `${spacing[3]}px ${spacing[4]}px`,
                    textAlign: 'right',
                    fontSize: typography.caption.fontSize,
                    fontWeight: typography.weights.semibold,
                    color: colors.textMuted,
                    borderBottom: borderSubtle(),
                    width: 56,
                  }}
                >
                  <span className="sr-only">Actions</span>
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => {
              const actions = rowActions?.(row) ?? [];
              return (
                <tr key={getRowId(row)} className="nb-data-table__row">
                  {columns.map((column) => (
                    <td
                      key={column.id}
                      className={column.hideOnMobile ? 'nb-data-table__hide-mobile' : undefined}
                      style={{
                        padding: `${spacing[4]}px ${spacing[4]}px`,
                        textAlign: column.align ?? 'left',
                        borderBottom: borderSubtle(),
                        fontSize: typography.bodySm.fontSize,
                        fontWeight: typography.bodySm.fontWeight,
                        color: colors.secondary,
                        verticalAlign: 'middle',
                      }}
                    >
                      {column.cell(row)}
                    </td>
                  ))}
                  {showActions ? (
                    <td
                      style={{
                        padding: `${spacing[3]}px ${spacing[4]}px`,
                        textAlign: 'right',
                        borderBottom: borderSubtle(),
                        verticalAlign: 'middle',
                      }}
                    >
                      {actions.length > 0 ? (
                        <DropdownMenu label="Actions de la ligne" items={actions} align="end" />
                      ) : null}
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

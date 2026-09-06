'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { DropdownMenu, type DropdownMenuItem } from './dropdown-menu.js';
import { EmptyState } from './empty-state.js';
import { IconChevronDown, IconChevronLeft, IconChevronRight, IconChevronUp } from './icons.js';

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

export type DataTablePrimaryAction = {
  label: string;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
};

export type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  /** Optional row action menu items. */
  rowActions?: (row: T) => DropdownMenuItem[];
  /** Visible primary action (link or button) instead of hiding work behind a menu. */
  rowPrimaryAction?: (row: T) => DataTablePrimaryAction | null;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  emptyIcon?: ReactNode;
  /** Caption above the table (e.g. "12 colis"). */
  caption?: string;
  /** Controls aligned with the caption, typically a search field. */
  toolbar?: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Initial sort column id. */
  initialSortId?: string;
  initialSortDirection?: SortDirection;
  selectedRowId?: string;
  hoveredRowId?: string | null;
  onRowSelect?: (rowId: string) => void;
  onRowHover?: (rowId: string | null) => void;
  /** When set, paginate once the row count exceeds this size. */
  pageSize?: number;
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

function SortGlyph({ active, direction }: { active: boolean; direction: SortDirection }) {
  if (!active) {
    return (
      <span aria-hidden className="nb-data-table__sort-icon is-idle">
        <IconChevronUp width={10} height={10} />
        <IconChevronDown width={10} height={10} />
      </span>
    );
  }

  return (
    <span aria-hidden className="nb-data-table__sort-icon is-active">
      {direction === 'desc' ? (
        <IconChevronDown width={12} height={12} />
      ) : (
        <IconChevronUp width={12} height={12} />
      )}
    </span>
  );
}

/**
 * Enterprise data table: sortable headers, status-friendly cells, row actions, empty state.
 */
export function DataTable<T>({
  columns,
  rows,
  getRowId,
  rowActions,
  rowPrimaryAction,
  emptyTitle = 'Aucun élément',
  emptyDescription,
  emptyAction,
  emptyIcon,
  caption,
  toolbar,
  className,
  style,
  initialSortId,
  initialSortDirection = 'asc',
  selectedRowId,
  hoveredRowId,
  onRowSelect,
  onRowHover,
  pageSize,
}: DataTableProps<T>) {
  const [sortId, setSortId] = useState<string | null>(initialSortId ?? null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(initialSortDirection);
  const [page, setPage] = useState(0);
  const tableRef = useRef<HTMLTableElement>(null);
  const sortedRowsRef = useRef<T[]>([]);
  const getRowIdRef = useRef(getRowId);
  getRowIdRef.current = getRowId;

  const sortedRows = useMemo(() => {
    if (!sortId) return rows;
    const column = columns.find((col) => col.id === sortId);
    if (!column?.sortable || !column.sortValue) return rows;

    return [...rows].sort((left, right) =>
      compareValues(column.sortValue!(left), column.sortValue!(right), sortDirection),
    );
  }, [columns, rows, sortDirection, sortId]);

  sortedRowsRef.current = sortedRows;

  const paginated = pageSize != null && pageSize > 0;
  const pageCount = paginated ? Math.max(1, Math.ceil(sortedRows.length / pageSize)) : 1;
  const currentPage = Math.min(page, pageCount - 1);
  const visibleRows = paginated
    ? sortedRows.slice(currentPage * pageSize, currentPage * pageSize + pageSize)
    : sortedRows;
  const showPagination = paginated && sortedRows.length > pageSize;

  function toggleSort(column: DataTableColumn<T>) {
    if (!column.sortable) return;
    setPage(0);
    if (sortId === column.id) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortId(column.id);
    setSortDirection('asc');
  }

  useEffect(() => {
    if (!selectedRowId || pageSize == null || pageSize <= 0) return;
    const index = sortedRowsRef.current.findIndex((row) => getRowIdRef.current(row) === selectedRowId);
    if (index < 0) return;
    setPage(Math.floor(index / pageSize));
  }, [pageSize, selectedRowId]);

  useEffect(() => {
    if (!selectedRowId) return;
    const row = tableRef.current?.querySelector<HTMLElement>(
      `[data-row-id="${CSS.escape(selectedRowId)}"]`,
    );
    row?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [currentPage, selectedRowId]);

  const showActions = Boolean(rowActions) || Boolean(rowPrimaryAction);
  const interactive = Boolean(onRowSelect);

  function renderHeader() {
    if (!caption && !toolbar) return null;
    return (
      <div className="nb-data-table__header">
        {caption ? <p className="nb-data-table__caption">{caption}</p> : <span />}
        {toolbar ? <div className="nb-data-table__tools">{toolbar}</div> : null}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className={['nb-data-table', className].filter(Boolean).join(' ')} style={style}>
        {renderHeader()}
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          action={emptyAction}
          icon={emptyIcon}
          compact
        />
      </div>
    );
  }

  return (
    <div className={['nb-data-table', className].filter(Boolean).join(' ')} style={style}>
      {renderHeader()}

      <div className="nb-data-table__scroll">
        <table ref={tableRef}>
          <thead>
            <tr>
              {columns.map((column) => {
                const active = sortId === column.id;
                const align = column.align ?? 'left';
                return (
                  <th
                    key={column.id}
                    scope="col"
                    className={column.hideOnMobile ? 'nb-data-table__hide-mobile' : undefined}
                    style={{ textAlign: align, width: column.width }}
                    aria-sort={
                      column.sortable
                        ? active
                          ? sortDirection === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : 'none'
                        : undefined
                    }
                  >
                    {column.sortable ? (
                      <button
                        type="button"
                        className="nb-data-table__sort"
                        onClick={() => toggleSort(column)}
                        title={`Trier par ${column.header}`}
                      >
                        {column.header}
                        <SortGlyph active={active} direction={sortDirection} />
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
              {showActions ? (
                <th scope="col" className="nb-data-table__actions">
                  <span className="sr-only">Actions</span>
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => {
              const rowId = getRowId(row);
              const actions = rowActions?.(row) ?? [];
              const primary = rowPrimaryAction?.(row) ?? null;
              const selected = selectedRowId === rowId;
              const highlighted = hoveredRowId === rowId;
              const rowClass = [
                'nb-data-table__row',
                interactive ? 'is-interactive' : null,
                selected ? 'is-selected' : null,
                highlighted && !selected ? 'is-highlighted' : null,
              ]
                .filter(Boolean)
                .join(' ');

              return (
                <tr
                  key={rowId}
                  data-row-id={rowId}
                  className={rowClass}
                  aria-selected={interactive ? selected : undefined}
                  onClick={() => onRowSelect?.(rowId)}
                  onMouseEnter={() => onRowHover?.(rowId)}
                  onMouseLeave={() => onRowHover?.(null)}
                >
                  {columns.map((column) => (
                    <td
                      key={column.id}
                      className={column.hideOnMobile ? 'nb-data-table__hide-mobile' : undefined}
                      style={{ textAlign: column.align ?? 'left' }}
                    >
                      {column.cell(row)}
                    </td>
                  ))}
                  {showActions ? (
                    <td className="nb-data-table__actions">
                      <div className="nb-data-table__action-group">
                        {primary ? (
                          primary.href && !primary.disabled ? (
                            <Link
                              href={primary.href}
                              className="nb-btn nb-btn-secondary nb-btn--sm"
                              title={primary.title ?? primary.label}
                              onClick={(event) => event.stopPropagation()}
                            >
                              {primary.label}
                            </Link>
                          ) : (
                            <button
                              type="button"
                              className="nb-btn nb-btn-secondary nb-btn--sm"
                              disabled={primary.disabled}
                              title={primary.title ?? primary.label}
                              onClick={(event) => {
                                event.stopPropagation();
                                if (!primary.disabled) primary.onClick?.();
                              }}
                            >
                              {primary.label}
                            </button>
                          )
                        ) : null}
                        {actions.length > 0 ? (
                          <DropdownMenu label="Actions de la ligne" items={actions} align="end" />
                        ) : null}
                      </div>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showPagination ? (
        <div className="nb-data-table__pagination">
          <p className="nb-data-table__pagination-status">
            {currentPage * (pageSize ?? 0) + 1}–
            {Math.min(sortedRows.length, (currentPage + 1) * (pageSize ?? 0))} sur {sortedRows.length}
          </p>
          <div className="nb-data-table__pagination-controls">
            <button
              type="button"
              className="nb-btn nb-btn-ghost nb-btn--sm"
              disabled={currentPage === 0}
              aria-label="Page précédente"
              onClick={() => setPage(Math.max(0, currentPage - 1))}
            >
              <IconChevronLeft width={16} height={16} />
              Précédent
            </button>
            <button
              type="button"
              className="nb-btn nb-btn-ghost nb-btn--sm"
              disabled={currentPage >= pageCount - 1}
              aria-label="Page suivante"
              onClick={() => setPage(Math.min(pageCount - 1, currentPage + 1))}
            >
              Suivant
              <IconChevronRight width={16} height={16} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

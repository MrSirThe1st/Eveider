'use client';

import Link from 'next/link';
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { DropdownMenu, type DropdownMenuItem } from './dropdown-menu.js';
import { EmptyState } from './empty-state.js';
import { ErrorState } from './error-state.js';
import { IconChevronDown, IconChevronLeft, IconChevronRight, IconChevronUp } from './icons.js';
import {
  DEFAULT_TABLE_PAGE_SIZE_OPTIONS,
  compareValues,
  mergeSelection,
  nextSortState,
  pageCountFor,
  pageRangeLabel,
  paginationItems,
  resolveRowActions,
  shouldShowJumpTo,
  slicePage,
  toggleId,
  type DataTableSortState,
  type ResolvedRowAction,
  type SortDirection,
} from './data-table-model.js';

export type { SortDirection } from './data-table-model.js';
export {
  DEFAULT_TABLE_PAGE_SIZE,
  DEFAULT_TABLE_PAGE_SIZE_OPTIONS,
} from './data-table-model.js';

export type DataTableColumn<T> = {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  sortable?: boolean;
  sortValue?: (row: T) => string | number | null | undefined;
  align?: 'left' | 'right';
  numeric?: boolean;
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

export type DataTableSelection = {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
};

export type DataTableError = {
  title?: string;
  message: string;
  action?: ReactNode;
};

export type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  rowActions?: (row: T) => DropdownMenuItem[];
  rowPrimaryAction?: (row: T) => DataTablePrimaryAction | null;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  emptyIcon?: ReactNode;
  caption?: string;
  toolbar?: ReactNode;
  search?: ReactNode;
  filters?: ReactNode;
  trailing?: ReactNode;
  className?: string;
  style?: CSSProperties;
  initialSortId?: string;
  initialSortDirection?: SortDirection;
  /** Sort this column from the toolbar (A→Z / Z→A). Disables clickable headers. */
  sortBy?: string;
  selectedRowId?: string;
  hoveredRowId?: string | null;
  onRowSelect?: (rowId: string) => void;
  onRowHover?: (rowId: string | null) => void;
  pageSize?: number;
  pageSizeOptions?: number[];
  showJumpTo?: boolean;
  loading?: boolean;
  loadingRows?: number;
  error?: DataTableError | null;
  selection?: DataTableSelection;
  batchActions?: ReactNode;
  getRowLabel?: (row: T) => string;
  expandedRowId?: string | null;
  renderExpanded?: (row: T) => ReactNode;
};

const SORT_OPTIONS: { value: SortDirection; label: string }[] = [
  { value: 'asc', label: 'A → Z' },
  { value: 'desc', label: 'Z → A' },
];

function TableSortControl({
  value,
  onChange,
}: {
  value: SortDirection;
  onChange: (next: SortDirection) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const currentLabel = value === 'desc' ? 'Z → A' : 'A → Z';

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="nb-data-table__sort-control">
      <button
        type="button"
        className="nb-filter-chip-active"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label="Trier"
        onClick={() => setOpen((currentOpen) => !currentOpen)}
      >
        <span className="nb-data-table__sort-control-label">Trier</span>
        <span>{currentLabel}</span>
        <span aria-hidden>▾</span>
      </button>
      {open ? (
        <ul id={menuId} role="listbox" aria-label="Trier">
          {SORT_OPTIONS.map((option) => (
            <li key={option.value}>
              <button
                type="button"
                role="option"
                aria-selected={option.value === value}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
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

function toResolvedAction(item: DropdownMenuItem): ResolvedRowAction {
  return {
    id: item.id,
    label: item.label,
    href: item.href,
    onClick: item.onClick,
    disabled: item.disabled,
    tone: item.tone,
  };
}

function ActionControl({
  action,
  variant,
}: {
  action: ResolvedRowAction;
  variant: 'button' | 'link';
}) {
  const className =
    variant === 'button'
      ? 'nb-btn nb-btn-secondary nb-btn--sm'
      : action.tone === 'danger'
        ? 'nb-data-table__action-link is-danger'
        : 'nb-data-table__action-link';

  if (action.href && !action.disabled) {
    return (
      <Link
        href={action.href}
        className={className}
        title={action.title ?? action.label}
        onClick={(event) => event.stopPropagation()}
      >
        {action.label}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={className}
      disabled={action.disabled}
      title={action.title ?? action.label}
      onClick={(event) => {
        event.stopPropagation();
        if (!action.disabled) action.onClick?.();
      }}
    >
      {action.label}
    </button>
  );
}

function PaginationBar({
  page,
  pageCount,
  pageSize,
  rowCount,
  pageSizeOptions,
  showJumpTo,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageCount: number;
  pageSize: number;
  rowCount: number;
  pageSizeOptions: number[];
  showJumpTo: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  const items = paginationItems(page, pageCount);
  const [jumpValue, setJumpValue] = useState(String(page + 1));

  useEffect(() => {
    setJumpValue(String(page + 1));
  }, [page]);

  function submitJump() {
    const next = Number.parseInt(jumpValue, 10);
    if (!Number.isFinite(next)) return;
    onPageChange(Math.min(pageCount - 1, Math.max(0, next - 1)));
  }

  return (
    <div className="nb-data-table__pagination">
      <p className="nb-data-table__pagination-status">{pageRangeLabel(page, pageSize, rowCount)}</p>
      <label className="nb-data-table__page-size">
        <span>Afficher</span>
        <select
          aria-label="Nombre de lignes par page"
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
        >
          {pageSizeOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
      <div className="nb-data-table__pagination-controls">
        <button
          type="button"
          className="nb-data-table__page-btn"
          disabled={page === 0}
          aria-label="Page précédente"
          onClick={() => onPageChange(Math.max(0, page - 1))}
        >
          <IconChevronLeft width={14} height={14} />
        </button>
        {items.map((item, index) =>
          item === 'ellipsis' ? (
            <span key={`ellipsis-${index}`} className="nb-data-table__page-ellipsis" aria-hidden>
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              className={['nb-data-table__page-btn', item === page ? 'is-current' : null]
                .filter(Boolean)
                .join(' ')}
              aria-current={item === page ? 'page' : undefined}
              aria-label={`Page ${item + 1}`}
              onClick={() => onPageChange(item)}
            >
              {item + 1}
            </button>
          ),
        )}
        <button
          type="button"
          className="nb-data-table__page-btn"
          disabled={page >= pageCount - 1}
          aria-label="Page suivante"
          onClick={() => onPageChange(Math.min(pageCount - 1, page + 1))}
        >
          <IconChevronRight width={14} height={14} />
        </button>
        {showJumpTo ? (
          <label className="nb-data-table__jump">
            <span>Aller à</span>
            <input
              type="number"
              min={1}
              max={pageCount}
              value={jumpValue}
              aria-label="Aller à la page"
              onChange={(event) => setJumpValue(event.target.value)}
              onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  submitJump();
                }
              }}
              onBlur={submitJump}
            />
          </label>
        ) : null}
      </div>
    </div>
  );
}

function SkeletonRows({
  columns,
  rows,
  hasActions,
  hasSelection,
}: {
  columns: number;
  rows: number;
  hasActions: boolean;
  hasSelection: boolean;
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, row) => (
        <tr key={row} className="nb-data-table__row is-skeleton">
          {hasSelection ? (
            <td className="nb-data-table__select">
              <span className="nb-data-table__skeleton-block" />
            </td>
          ) : null}
          {Array.from({ length: columns }).map((__, col) => (
            <td key={col}>
              <span
                className="nb-data-table__skeleton-block"
                style={{ width: col === 0 ? '70%' : '55%' }}
              />
            </td>
          ))}
          {hasActions ? (
            <td className="nb-data-table__actions">
              <span className="nb-data-table__skeleton-block" style={{ width: 64, marginLeft: 'auto' }} />
            </td>
          ) : null}
        </tr>
      ))}
    </>
  );
}

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
  search,
  filters,
  trailing,
  className,
  style,
  initialSortId,
  initialSortDirection = 'asc',
  sortBy,
  selectedRowId,
  hoveredRowId,
  onRowSelect,
  onRowHover,
  pageSize,
  pageSizeOptions = [...DEFAULT_TABLE_PAGE_SIZE_OPTIONS],
  showJumpTo,
  loading = false,
  loadingRows = 8,
  error = null,
  selection,
  batchActions,
  getRowLabel,
  expandedRowId,
  renderExpanded,
}: DataTableProps<T>) {
  const [sort, setSort] = useState<DataTableSortState>({
    id: sortBy ?? initialSortId ?? null,
    direction: sortBy ? 'asc' : initialSortDirection,
  });
  const [page, setPage] = useState(0);
  const [currentPageSize, setCurrentPageSize] = useState(pageSize ?? 0);
  const tableRef = useRef<HTMLTableElement>(null);
  const sortedRowsRef = useRef<T[]>([]);
  const getRowIdRef = useRef(getRowId);
  getRowIdRef.current = getRowId;
  const headerSortEnabled = !sortBy;

  useEffect(() => {
    setCurrentPageSize(pageSize ?? 0);
  }, [pageSize]);

  const sortedRows = useMemo(() => {
    const columnId = sortBy ?? sort.id;
    if (!columnId) return rows;
    const column = columns.find((col) => col.id === columnId);
    if (!column?.sortValue) return rows;
    return [...rows].sort((left, right) =>
      compareValues(column.sortValue!(left), column.sortValue!(right), sort.direction),
    );
  }, [columns, rows, sort, sortBy]);

  sortedRowsRef.current = sortedRows;

  const paginated = currentPageSize > 0;
  const count = pageCountFor(sortedRows.length, paginated ? currentPageSize : sortedRows.length || 1);
  const currentPage = Math.min(page, count - 1);
  const visibleRows = paginated ? slicePage(sortedRows, currentPage, currentPageSize) : sortedRows;

  useEffect(() => {
    if (!selectedRowId || !paginated) return;
    const index = sortedRowsRef.current.findIndex((row) => getRowIdRef.current(row) === selectedRowId);
    if (index < 0) return;
    setPage(Math.floor(index / currentPageSize));
  }, [currentPageSize, paginated, selectedRowId]);

  useEffect(() => {
    if (!selectedRowId) return;
    const row = tableRef.current?.querySelector<HTMLElement>(
      `[data-row-id="${CSS.escape(selectedRowId)}"]`,
    );
    row?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [currentPage, selectedRowId]);

  const showActions = Boolean(rowActions) || Boolean(rowPrimaryAction);
  const interactive = Boolean(onRowSelect);
  const selectedCount = selection?.selectedIds.length ?? 0;
  const hasModernToolbar = Boolean(search || filters || trailing || selectedCount > 0);
  const hasToolbar = hasModernToolbar || Boolean(caption || toolbar || sortBy);
  const visibleIds = visibleRows.map((row) => getRowId(row));
  const allVisibleSelected =
    Boolean(selection) &&
    visibleIds.length > 0 &&
    visibleIds.every((id) => selection!.selectedIds.includes(id));
  const someVisibleSelected =
    Boolean(selection) && visibleIds.some((id) => selection!.selectedIds.includes(id));

  function toggleSort(column: DataTableColumn<T>) {
    if (!headerSortEnabled || !column.sortable) return;
    setPage(0);
    setSort((current) => nextSortState(current, column.id));
  }

  function setToolbarSort(direction: SortDirection) {
    if (!sortBy) return;
    setPage(0);
    setSort({ id: sortBy, direction });
  }

  function renderToolbar() {
    if (!hasToolbar) return null;

    if (selectedCount > 0 && selection) {
      return (
        <div className="nb-data-table__toolbar is-selection">
          <p className="nb-data-table__selection-count">
            {selectedCount} sélectionné{selectedCount > 1 ? 's' : ''}
          </p>
          <div className="nb-data-table__toolbar-end">
            {batchActions}
            <button
              type="button"
              className="nb-btn nb-btn-ghost nb-btn--sm"
              onClick={() => selection.onChange([])}
            >
              Annuler la sélection
            </button>
          </div>
        </div>
      );
    }

    if (hasModernToolbar) {
      return (
        <div className="nb-data-table__toolbar">
          <div className="nb-data-table__toolbar-start">
            {search ? <div className="nb-data-table__search">{search}</div> : null}
            {filters ? <div className="nb-data-table__filters">{filters}</div> : null}
            {sortBy ? (
              <TableSortControl value={sort.direction} onChange={setToolbarSort} />
            ) : null}
          </div>
          <div className="nb-data-table__toolbar-end">
            {caption ? <p className="nb-data-table__caption">{caption}</p> : null}
            {trailing}
          </div>
        </div>
      );
    }

    return (
      <div className="nb-data-table__header">
        {caption ? <p className="nb-data-table__caption">{caption}</p> : <span />}
        {sortBy ? <TableSortControl value={sort.direction} onChange={setToolbarSort} /> : null}
        {toolbar ? <div className="nb-data-table__tools">{toolbar}</div> : null}
      </div>
    );
  }

  const showTable = loading || Boolean(error) || rows.length > 0;
  const colSpan = columns.length + (showActions ? 1 : 0) + (selection ? 1 : 0);

  return (
    <div className={['nb-data-table', className].filter(Boolean).join(' ')} style={style}>
      {renderToolbar()}

      {showTable ? (
        <div className="nb-data-table__scroll" aria-busy={loading || undefined}>
          <table ref={tableRef}>
            <thead>
              <tr>
                {selection ? (
                  <th scope="col" className="nb-data-table__select">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      ref={(node) => {
                        if (node) node.indeterminate = someVisibleSelected && !allVisibleSelected;
                      }}
                      aria-label="Sélectionner les lignes visibles"
                      onChange={(event) =>
                        selection.onChange(
                          mergeSelection(selection.selectedIds, visibleIds, event.target.checked),
                        )
                      }
                    />
                  </th>
                ) : null}
                {columns.map((column) => {
                  const active = sort.id === column.id;
                  const align = column.numeric ? 'right' : (column.align ?? 'left');
                  return (
                    <th
                      key={column.id}
                      scope="col"
                      className={
                        [
                          column.hideOnMobile ? 'nb-data-table__hide-mobile' : null,
                          column.numeric ? 'nb-data-table__numeric' : null,
                        ]
                          .filter(Boolean)
                          .join(' ') || undefined
                      }
                      style={{ textAlign: align, width: column.width }}
                      aria-sort={
                        headerSortEnabled && column.sortable
                          ? active
                            ? sort.direction === 'asc'
                              ? 'ascending'
                              : 'descending'
                            : 'none'
                          : undefined
                      }
                    >
                      {headerSortEnabled && column.sortable ? (
                        <button
                          type="button"
                          className="nb-data-table__sort"
                          onClick={() => toggleSort(column)}
                          title={`Trier par ${column.header}`}
                          aria-label={`Trier par ${column.header}`}
                        >
                          {column.header}
                          <SortGlyph active={active} direction={sort.direction} />
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
              {error && rows.length === 0 && !loading ? (
                <tr>
                  <td colSpan={colSpan}>
                    <ErrorState compact title={error.title} message={error.message} action={error.action} />
                  </td>
                </tr>
              ) : loading && rows.length === 0 ? (
                <SkeletonRows
                  columns={columns.length}
                  rows={loadingRows}
                  hasActions={showActions}
                  hasSelection={Boolean(selection)}
                />
              ) : (
                visibleRows.map((row) => {
                  const rowId = getRowId(row);
                  const extras = (rowActions?.(row) ?? []).map(toResolvedAction);
                  const primaryRaw = rowPrimaryAction?.(row) ?? null;
                  const primary = primaryRaw
                    ? {
                        id: '__primary',
                        label: primaryRaw.label,
                        href: primaryRaw.href,
                        onClick: primaryRaw.onClick,
                        disabled: primaryRaw.disabled,
                        title: primaryRaw.title,
                      }
                    : null;
                  const actions = resolveRowActions(primary, extras);
                  const selected = selectedRowId === rowId;
                  const highlighted = hoveredRowId === rowId;
                  const checked = selection?.selectedIds.includes(rowId) ?? false;
                  const expanded = expandedRowId === rowId;
                  const rowClass = [
                    'nb-data-table__row',
                    interactive ? 'is-interactive' : null,
                    selected ? 'is-selected' : null,
                    highlighted && !selected ? 'is-highlighted' : null,
                    checked ? 'is-checked' : null,
                    expanded ? 'is-expanded' : null,
                  ]
                    .filter(Boolean)
                    .join(' ');

                  return (
                    <TableBodyRow
                      key={rowId}
                      rowId={rowId}
                      rowClass={rowClass}
                      interactive={interactive}
                      selected={selected}
                      columns={columns}
                      selection={selection}
                      checked={checked}
                      getRowLabel={getRowLabel}
                      row={row}
                      showActions={showActions}
                      actions={actions}
                      onRowSelect={onRowSelect}
                      onRowHover={onRowHover}
                      expanded={expanded}
                      expandedContent={expanded ? renderExpanded?.(row) : null}
                      colSpan={colSpan}
                    />
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="nb-data-table__empty">
          <EmptyState
            title={emptyTitle}
            description={emptyDescription}
            action={emptyAction}
            icon={emptyIcon}
            compact
          />
        </div>
      )}

      {paginated && (sortedRows.length > 0 || loading) ? (
        <PaginationBar
          page={currentPage}
          pageCount={count}
          pageSize={currentPageSize}
          rowCount={sortedRows.length}
          pageSizeOptions={
            pageSizeOptions.includes(currentPageSize)
              ? pageSizeOptions
              : [...pageSizeOptions, currentPageSize].sort((a, b) => a - b)
          }
          showJumpTo={showJumpTo ?? shouldShowJumpTo(count)}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setCurrentPageSize(size);
            setPage(0);
          }}
        />
      ) : null}
    </div>
  );
}

function TableBodyRow<T>({
  rowId,
  rowClass,
  interactive,
  selected,
  columns,
  selection,
  checked,
  getRowLabel,
  row,
  showActions,
  actions,
  onRowSelect,
  onRowHover,
  expanded,
  expandedContent,
  colSpan,
}: {
  rowId: string;
  rowClass: string;
  interactive: boolean;
  selected: boolean;
  columns: DataTableColumn<T>[];
  selection?: DataTableSelection;
  checked: boolean;
  getRowLabel?: (row: T) => string;
  row: T;
  showActions: boolean;
  actions: ReturnType<typeof resolveRowActions>;
  onRowSelect?: (rowId: string) => void;
  onRowHover?: (rowId: string | null) => void;
  expanded: boolean;
  expandedContent: ReactNode;
  colSpan: number;
}) {
  return (
    <>
      <tr
        data-row-id={rowId}
        className={rowClass}
        aria-selected={interactive ? selected : undefined}
        onClick={() => onRowSelect?.(rowId)}
        onMouseEnter={() => onRowHover?.(rowId)}
        onMouseLeave={() => onRowHover?.(null)}
      >
        {selection ? (
          <td className="nb-data-table__select">
            <input
              type="checkbox"
              checked={checked}
              aria-label={getRowLabel?.(row) ?? 'Sélectionner la ligne'}
              onClick={(event) => event.stopPropagation()}
              onChange={() => selection.onChange(toggleId(selection.selectedIds, rowId))}
            />
          </td>
        ) : null}
        {columns.map((column) => (
          <td
            key={column.id}
            className={
              [
                column.hideOnMobile ? 'nb-data-table__hide-mobile' : null,
                column.numeric ? 'nb-data-table__numeric' : null,
              ]
                .filter(Boolean)
                .join(' ') || undefined
            }
            style={{ textAlign: column.numeric ? 'right' : (column.align ?? 'left') }}
          >
            {column.cell(row)}
          </td>
        ))}
        {showActions ? (
          <td className="nb-data-table__actions">
            <div className="nb-data-table__action-group">
              {actions.visible.map((action) => (
                <ActionControl
                  key={action.id}
                  action={action}
                  variant={action.id === '__primary' && actions.visible.length === 1 ? 'button' : 'link'}
                />
              ))}
              {actions.overflow.length > 0 ? (
                <DropdownMenu
                  label="Actions de la ligne"
                  items={actions.overflow.map((action) => ({
                    id: action.id,
                    label: action.label,
                    href: action.href,
                    onClick: action.onClick,
                    disabled: action.disabled,
                    tone: action.tone,
                  }))}
                  align="end"
                />
              ) : null}
            </div>
          </td>
        ) : null}
      </tr>
      {expanded && expandedContent ? (
        <tr className="nb-data-table__expanded">
          <td colSpan={colSpan}>
            <div className="nb-data-table__expanded-panel">{expandedContent}</div>
          </td>
        </tr>
      ) : null}
    </>
  );
}

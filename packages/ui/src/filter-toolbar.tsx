'use client';

import { colors, radius, spacing, typography, borderSubtle, shadows } from '@eveider/config-ui';
import { useEffect, useId, useRef, useState } from 'react';

export type FilterMenuOption = {
  value: string;
  label: string;
};

export type FilterDimension = {
  id: string;
  /** Dimension name shown on inactive "+ …" chip and in active chip prefix. */
  label: string;
  options: FilterMenuOption[];
  /** Current value. Treated as inactive when equal to `emptyValue`. */
  value: string;
  /** Value that means "no filter". Default `all` then `''`. */
  emptyValue?: string;
  onChange: (value: string) => void;
};

export type FilterToolbarProps = {
  filters: FilterDimension[];
  onClearAll: () => void;
  clearLabel?: string;
};

function isActive(filter: FilterDimension): boolean {
  const empty = filter.emptyValue ?? (filter.options.some((o) => o.value === 'all') ? 'all' : '');
  return filter.value !== empty && filter.value !== '';
}

function optionLabel(filter: FilterDimension): string {
  return filter.options.find((o) => o.value === filter.value)?.label ?? filter.value;
}

/**
 * Stripe-style horizontal filter chips: dropdown select, removable active chips, clear all.
 */
export function FilterToolbar({
  filters,
  onClearAll,
  clearLabel = 'Effacer les filtres',
}: FilterToolbarProps) {
  const anyActive = filters.some(isActive);

  return (
    <div
      className="nb-filter-toolbar"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: spacing[2],
        marginBottom: spacing[6],
      }}
    >
      {filters.map((filter) => (
        <FilterChip key={filter.id} filter={filter} />
      ))}
      {anyActive ? (
        <button
          type="button"
          className="nb-filter-toolbar__clear"
          onClick={onClearAll}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: spacing[1],
            border: 'none',
            background: 'transparent',
            color: colors.textMuted,
            fontSize: typography.bodySm.fontSize,
            fontWeight: typography.weights.semibold,
            cursor: 'pointer',
            padding: `${spacing[1]}px ${spacing[2]}px`,
          }}
        >
          ✕ {clearLabel}
        </button>
      ) : null}
    </div>
  );
}

function FilterChip({ filter }: { filter: FilterDimension }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const active = isActive(filter);
  const empty = filter.emptyValue ?? (filter.options.some((o) => o.value === 'all') ? 'all' : '');

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
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
    <div ref={rootRef} style={{ position: 'relative', display: 'inline-flex' }}>
      <div
        className={active ? 'nb-filter-chip-active' : 'nb-filter-chip-add'}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: spacing[1],
          height: 32,
          padding: active ? `0 ${spacing[1]}px 0 ${spacing[2]}px` : `0 ${spacing[3]}px`,
          borderRadius: radius.badge,
          border: active
            ? borderSubtle()
            : `1px dashed ${colors.borderSubtle}`,
          background: active ? colors.surface : 'transparent',
          color: colors.secondary,
          fontSize: typography.bodySm.fontSize,
          fontWeight: typography.weights.semibold,
        }}
      >
        {active ? (
          <button
            type="button"
            aria-label={`Retirer le filtre ${filter.label}`}
            onClick={() => filter.onChange(empty)}
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: colors.textMuted,
              padding: spacing[1],
              lineHeight: 1,
              fontSize: '0.75rem',
            }}
          >
            ✕
          </button>
        ) : null}

        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen((current) => !current)}
          style={{
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: spacing[1],
            padding: `${spacing[1]}px ${spacing[2]}px`,
            font: 'inherit',
            color: 'inherit',
            fontWeight: typography.weights.semibold,
          }}
        >
          {active ? (
            <>
              <span style={{ color: colors.textMuted }}>{filter.label}</span>
              <span>{optionLabel(filter)}</span>
            </>
          ) : (
            <span>+ {filter.label}</span>
          )}
          <span aria-hidden style={{ opacity: 0.55, fontSize: '0.65rem' }}>
            ▾
          </span>
        </button>
      </div>

      {open ? (
        <ul
          id={menuId}
          role="listbox"
          aria-label={filter.label}
          style={{
            position: 'absolute',
            top: `calc(100% + ${spacing[1]}px)`,
            left: 0,
            zIndex: 30,
            margin: 0,
            padding: spacing[1],
            listStyle: 'none',
            minWidth: 200,
            maxHeight: 280,
            overflowY: 'auto',
            background: colors.surface,
            border: borderSubtle(),
            borderRadius: radius.md,
            boxShadow: shadows.hard,
          }}
        >
          {filter.options.map((option) => {
            const selected = filter.value === option.value;
            return (
              <li key={option.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    filter.onChange(option.value);
                    setOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    width: '100%',
                    alignItems: 'center',
                    gap: spacing[2],
                    textAlign: 'left',
                    border: 'none',
                    background: selected ? colors.surfaceSubtle : 'transparent',
                    borderRadius: radius.sm,
                    padding: `${spacing[2]}px ${spacing[3]}px`,
                    cursor: 'pointer',
                    fontSize: typography.bodySm.fontSize,
                    fontWeight: selected
                      ? typography.weights.semibold
                      : typography.weights.medium,
                    color: colors.secondary,
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 3,
                      border: `1px solid ${selected ? colors.primary : colors.borderSubtle}`,
                      background: selected ? colors.primary : colors.surface,
                      flexShrink: 0,
                    }}
                  />
                  {option.label}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

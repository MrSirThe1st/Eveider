'use client';

import { colors, radius, spacing, typography, borderSubtle, webCardStyle } from '@eveider/config-ui';
import type { ReactNode } from 'react';

export type FilterChipItem<T extends string> = {
  value: T;
  label: string;
};

export type FilterChipGroupProps<T extends string> = {
  items: FilterChipItem<T>[];
  value: T;
  onChange: (value: T) => void;
};

export function FilterChipGroup<T extends string>({
  items,
  value,
  onChange,
}: FilterChipGroupProps<T>) {
  return (
    <div
      role="group"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: spacing[2],
      }}
    >
      {items.map((item) => {
        const active = value === item.value;
        return (
          <button
            key={item.value}
            type="button"
            className="nb-filter-chip"
            aria-pressed={active}
            onClick={() => onChange(item.value)}
            style={{
              padding: `${spacing[1] + 2}px ${spacing[4]}px`,
              borderRadius: radius.badge,
              border: active ? `1px solid ${colors.primary}` : borderSubtle(),
              background: active ? colors.successMuted : colors.surface,
              color: active ? '#067A07' : colors.secondary,
              fontWeight: active ? typography.weights.semibold : typography.weights.medium,
              fontSize: typography.bodySm.fontSize,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

export type FilterBarProps = {
  label: string;
  children: ReactNode;
  hint?: string;
};

export function FilterBar({ label, children, hint }: FilterBarProps) {
  return (
    <section
      style={{
        ...webCardStyle,
        padding: `${spacing[4]}px ${spacing[4] + 2}px`,
        marginBottom: spacing[6],
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: spacing[3],
          marginBottom: spacing[3] + 2,
          flexWrap: 'wrap',
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: typography.body.fontSize,
            fontWeight: typography.weights.semibold,
            color: colors.secondary,
          }}
        >
          {label}
        </p>
        {hint ? (
          <p
            style={{
              margin: 0,
              fontSize: typography.bodySm.fontSize,
              fontWeight: typography.weights.medium,
              color: colors.textMuted,
            }}
          >
            {hint}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

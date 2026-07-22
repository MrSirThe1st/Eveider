'use client';

import { colors, radius, borderSubtle, borderStrong, webCardStyle } from '@eveider/config-ui';
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
        gap: '0.5rem',
      }}
    >
      {items.map((item) => {
        const active = value === item.value;
        return (
          <button
            key={item.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(item.value)}
            style={{
              padding: '0.4rem 1rem',
              borderRadius: 999,
              border: active ? '1px solid #09D40B' : borderSubtle(),
              background: active ? '#DCF5D6' : colors.surface,
              color: active ? '#067A07' : colors.secondary,
              fontWeight: active ? 600 : 500,
              fontSize: '0.8125rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
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
        padding: '1rem 1.125rem',
        marginBottom: '1.5rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: '0.75rem',
          marginBottom: '0.875rem',
          flexWrap: 'wrap',
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: '0.9375rem',
            fontWeight: 600,
            color: colors.secondary,
          }}
        >
          {label}
        </p>
        {hint ? (
          <p
            style={{
              margin: 0,
              fontSize: '0.8125rem',
              fontWeight: 500,
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

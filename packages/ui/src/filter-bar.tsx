'use client';

import { colors, radius } from '@eveider/config-ui';
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
              padding: '0.5rem 0.875rem',
              borderRadius: radius.button,
              border: `1px solid ${active ? colors.primary : colors.border}`,
              background: active ? colors.primary : colors.surface,
              color: colors.secondary,
              fontWeight: 600,
              fontSize: '0.6875rem',
              letterSpacing: '0.06em',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: active ? 'inset 0 0 0 1px rgba(18,18,18,0.04)' : 'none',
              transition: 'background 120ms ease, border-color 120ms ease',
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
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.card,
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
            fontSize: '0.6875rem',
            fontWeight: 700,
            letterSpacing: '0.1em',
            color: colors.secondary,
            opacity: 0.7,
          }}
        >
          {label}
        </p>
        {hint ? (
          <p
            style={{
              margin: 0,
              fontSize: '0.75rem',
              fontWeight: 500,
              color: colors.secondary,
              opacity: 0.55,
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

'use client';

import { colors, webInputStyle } from '@eveider/config-ui';

type ListSearchFieldProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  /** Accessible label when no visible label is shown. */
  ariaLabel?: string;
};

export function ListSearchField({
  value,
  onChange,
  placeholder,
  ariaLabel = 'Rechercher',
}: ListSearchFieldProps) {
  return (
    <div style={{ flex: '1 1 240px', maxWidth: 420, position: 'relative' }}>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        style={{
          ...webInputStyle,
          width: '100%',
          height: 44,
          padding: '0 36px 0 38px',
          fontSize: '0.8125rem',
          outline: 'none',
          background: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23121212' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='11' cy='11' r='8'%3E%3C/circle%3E%3Cline x1='21' y1='21' x2='16.65' y2='16.65'%3E%3C/line%3E%3C/svg%3E") no-repeat 14px center`,
          backgroundColor: colors.surface,
        }}
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Effacer la recherche"
          style={{
            position: 'absolute',
            right: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '1.125rem',
            lineHeight: 1,
            color: colors.textMuted,
            padding: 0,
          }}
        >
          ×
        </button>
      ) : null}
    </div>
  );
}

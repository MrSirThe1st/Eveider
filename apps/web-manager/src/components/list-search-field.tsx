'use client';

import { colors, webInputStyle } from '@eveider/config-ui';
import { IconSearch } from '@eveider/ui';

type ListSearchFieldProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  /** Accessible label when no visible label is shown. */
  ariaLabel?: string;
  className?: string;
};

export function ListSearchField({
  value,
  onChange,
  placeholder,
  ariaLabel = 'Rechercher',
  className,
}: ListSearchFieldProps) {
  return (
    <div className={['ops-search', className].filter(Boolean).join(' ')}>
      <span className="ops-search__icon" aria-hidden>
        <IconSearch width={16} height={16} />
      </span>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="nb-input ops-search__input"
        style={{
          ...webInputStyle,
          height: 36,
          padding: '0 36px',
          backgroundColor: colors.surface,
        }}
      />
      {value ? (
        <button type="button" onClick={() => onChange('')} aria-label="Effacer la recherche" className="ops-search__clear">
          ×
        </button>
      ) : null}
    </div>
  );
}

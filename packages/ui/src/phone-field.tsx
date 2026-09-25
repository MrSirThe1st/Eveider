'use client';

import type { CSSProperties } from 'react';
import { DRC_PHONE_PREFIX, toE164Phone, toNationalPhoneDigits } from '@eveider/domain';
import { colors, spacing, typography } from '@eveider/config-ui';

export type PhoneFieldProps = {
  label?: string;
  name?: string;
  /** Full value including `+243` (or empty). */
  value: string;
  onChange: (e164: string) => void;
  hint?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  className?: string;
  style?: CSSProperties;
  autoComplete?: string;
};

/**
 * Phone input with a fixed `+243` prefix. Stored value is always `+243…` or `''`.
 */
export function PhoneField({
  label,
  name,
  value,
  onChange,
  hint,
  error,
  required,
  disabled,
  id,
  className,
  style,
  autoComplete = 'tel-national',
}: PhoneFieldProps) {
  const fieldId = id ?? name;
  const errorId = error && fieldId ? `${fieldId}-error` : undefined;
  const hintId = !error && hint && fieldId ? `${fieldId}-hint` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;
  const national = toNationalPhoneDigits(value);

  return (
    <div className={className} style={style}>
      {label ? (
        <label
          htmlFor={fieldId}
          style={{
            display: 'block',
            fontSize: typography.label.fontSize,
            fontWeight: typography.label.fontWeight,
            lineHeight: typography.label.lineHeight,
            color: colors.secondary,
          }}
        >
          {label}
        </label>
      ) : null}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'auto 1fr',
          alignItems: 'stretch',
          marginTop: label ? spacing[2] : 0,
          border: `1px solid ${error ? colors.danger : colors.border}`,
          borderRadius: 8,
          background: colors.surface,
          overflow: 'hidden',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <span
          aria-hidden
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '0 0.85rem',
            borderRight: `1px solid ${colors.border}`,
            background: colors.background,
            color: colors.textMuted,
            fontSize: '0.875rem',
            fontWeight: 600,
            letterSpacing: '0.01em',
            userSelect: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          {DRC_PHONE_PREFIX}
        </span>
        <input
          id={fieldId}
          name={name}
          className={error ? 'nb-input nb-input--error' : 'nb-input'}
          type="tel"
          inputMode="numeric"
          autoComplete={autoComplete}
          required={required}
          disabled={disabled}
          value={national}
          placeholder="810000000"
          aria-label={label ? `${label}, indicatif ${DRC_PHONE_PREFIX}` : `Téléphone ${DRC_PHONE_PREFIX}`}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          onChange={(event) => {
            onChange(toE164Phone(event.target.value));
          }}
          style={{
            border: 0,
            borderRadius: 0,
            boxShadow: 'none',
            outline: 'none',
            background: 'transparent',
            height: '100%',
            minHeight: 42,
          }}
        />
      </div>

      {error ? (
        <p id={errorId} className="nb-field-error" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="nb-field-hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

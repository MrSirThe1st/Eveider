'use client';

import type { CSSProperties, InputHTMLAttributes, ReactNode } from 'react';
import { colors, spacing, typography } from '@eveider/config-ui';

export type TextFieldProps = {
  label?: string;
  /** Helper text below the input (ignored when `error` is set). */
  hint?: string;
  /** Validation message — sets aria-invalid and error styling. */
  error?: string;
  /** Visual success border (e.g. confirmed field). */
  success?: boolean;
  /** Optional trailing adornment inside the field. */
  trailing?: ReactNode;
  className?: string;
  style?: CSSProperties;
  inputStyle?: CSSProperties;
  id?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'style' | 'id'>;

/**
 * Labeled text input with validation states.
 * Use `error` for invalid, `success` for confirmed, `hint` for guidance.
 */
export function TextField({
  label,
  hint,
  error,
  success = false,
  trailing,
  className,
  style,
  inputStyle,
  id,
  disabled,
  ...rest
}: TextFieldProps) {
  const fieldId = id ?? rest.name;
  const errorId = error && fieldId ? `${fieldId}-error` : undefined;
  const hintId = !error && hint && fieldId ? `${fieldId}-hint` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  const inputClass = [
    'nb-input',
    error ? 'nb-input--error' : null,
    !error && success ? 'nb-input--success' : null,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div style={{ ...style }}>
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
          position: 'relative',
          marginTop: label ? spacing[2] : 0,
        }}
      >
        <input
          id={fieldId}
          className={inputClass}
          style={{
            paddingRight: trailing ? spacing[10] : undefined,
            ...inputStyle,
          }}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          {...rest}
        />
        {trailing ? (
          <div
            style={{
              position: 'absolute',
              right: spacing[1],
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {trailing}
          </div>
        ) : null}
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

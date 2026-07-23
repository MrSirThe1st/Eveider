'use client';

import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'md' | 'sm';

export type ButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows spinner and sets aria-busy; keeps the button disabled for interaction. */
  loading?: boolean;
  /** Optional leading icon (hidden while loading). */
  leadingIcon?: ReactNode;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'style' | 'children'>;

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'nb-btn-primary',
  secondary: 'nb-btn-secondary',
  danger: 'nb-btn-danger',
  ghost: 'nb-btn-ghost',
};

/**
 * Standard action control — primary / secondary / danger / ghost.
 * Prefer this over ad-hoc styled `<button>` elements.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  leadingIcon,
  disabled,
  children,
  className,
  type = 'button',
  style,
  ...rest
}: ButtonProps) {
  const classes = [
    'nb-btn',
    VARIANT_CLASS[variant],
    size === 'sm' ? 'nb-btn--sm' : null,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type={type}
      className={classes}
      style={style}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <span className="nb-btn__spinner" aria-hidden="true" /> : leadingIcon}
      {children}
    </button>
  );
}

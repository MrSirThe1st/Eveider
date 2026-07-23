'use client';

import { colors, radius, spacing, typography } from '@eveider/config-ui';
import type { CSSProperties, ReactNode } from 'react';

export type InlineAlertVariant = 'success' | 'error' | 'info';

export type InlineAlertProps = {
  message: string;
  variant?: InlineAlertVariant;
  onDismiss?: () => void;
  className?: string;
  style?: CSSProperties;
};

const VARIANT_STYLES: Record<
  InlineAlertVariant,
  { border: string; background: string; role: 'status' | 'alert' }
> = {
  success: {
    border: colors.success,
    background: colors.successMuted,
    role: 'status',
  },
  error: {
    border: colors.danger,
    background: colors.dangerMuted,
    role: 'alert',
  },
  info: {
    border: colors.info,
    background: colors.infoMuted,
    role: 'status',
  },
};

/**
 * Persistent in-page alert (forms, banners). Prefer Toast for transient feedback.
 */
export function InlineAlert({
  message,
  variant = 'success',
  onDismiss,
  className,
  style,
}: InlineAlertProps) {
  const tone = VARIANT_STYLES[variant];

  return (
    <div
      role={tone.role}
      className={['nb-alert', className].filter(Boolean).join(' ')}
      style={{
        marginBottom: spacing[6],
        padding: `${spacing[4]}px ${spacing[5]}px`,
        borderRadius: radius.card,
        border: `1px solid ${tone.border}`,
        background: tone.background,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing[4],
        ...style,
      }}
    >
      <p
        style={{
          margin: 0,
          fontWeight: typography.weights.semibold,
          fontSize: typography.bodySm.fontSize,
          color: colors.secondary,
          lineHeight: 1.45,
        }}
      >
        {message}
      </p>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Fermer"
          style={{
            background: 'none',
            border: 'none',
            fontWeight: typography.weights.semibold,
            cursor: 'pointer',
            color: colors.secondary,
            padding: spacing[1],
            lineHeight: 1,
          }}
        >
          ✕
        </button>
      ) : null}
    </div>
  );
}

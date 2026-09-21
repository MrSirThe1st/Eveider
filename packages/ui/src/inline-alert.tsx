'use client';

import { colors, radius, spacing, typography } from '@eveider/config-ui';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { IconX } from './icons.js';

export type InlineAlertVariant = 'success' | 'error' | 'info';

export type InlineAlertProps = {
  message: string;
  variant?: InlineAlertVariant;
  onDismiss?: () => void;
  /**
   * Auto-hide delay in ms. Success/error default to a short delay.
   * Pass `0` to keep the alert until it is closed (info notices default to this).
   */
  autoDismissMs?: number;
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

const DEFAULT_AUTO_DISMISS_MS: Record<InlineAlertVariant, number> = {
  success: 5000,
  error: 7000,
  info: 0,
};

export function inlineAlertAutoDismissMs(
  variant: InlineAlertVariant,
  override?: number,
): number {
  return override ?? DEFAULT_AUTO_DISMISS_MS[variant];
}

/**
 * In-page alert with a close control. Success and error banners hide on their own;
 * info notices stay until dismissed.
 */
export function InlineAlert({
  message,
  variant = 'success',
  onDismiss,
  autoDismissMs,
  className,
  style,
}: InlineAlertProps) {
  const [hidden, setHidden] = useState(false);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;
  const duration = inlineAlertAutoDismissMs(variant, autoDismissMs);
  const tone = VARIANT_STYLES[variant];

  useEffect(() => {
    setHidden(false);
    if (duration <= 0) return;
    const timer = window.setTimeout(() => {
      setHidden(true);
      onDismissRef.current?.();
    }, duration);
    return () => window.clearTimeout(timer);
  }, [message, variant, duration]);

  if (hidden) return null;

  function dismiss() {
    setHidden(true);
    onDismissRef.current?.();
  }

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
      <button
        type="button"
        onClick={dismiss}
        aria-label="Fermer"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          width: 28,
          height: 28,
          background: 'none',
          border: 'none',
          borderRadius: radius.sm,
          cursor: 'pointer',
          color: colors.textMuted,
          padding: 0,
        }}
      >
        <IconX width={16} height={16} />
      </button>
    </div>
  );
}

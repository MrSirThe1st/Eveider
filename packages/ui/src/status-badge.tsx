import { colors, radius, spacing, typography } from '@eveider/config-ui';
import type { CSSProperties, ReactNode } from 'react';

export type StatusBadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

export type StatusBadgeProps = {
  children: ReactNode;
  tone?: StatusBadgeTone;
  /** Show status dot indicator. */
  withDot?: boolean;
  className?: string;
  style?: CSSProperties;
};

const TONE_STYLES: Record<
  StatusBadgeTone,
  { bg: string; color: string; border: string; dot: string }
> = {
  neutral: {
    bg: colors.surfaceMuted,
    color: colors.textMuted,
    border: colors.borderSubtle,
    dot: colors.textMuted,
  },
  success: {
    bg: colors.successMuted,
    color: '#067A07',
    border: '#C0EAB7',
    dot: colors.success,
  },
  warning: {
    bg: colors.warningMuted,
    color: '#9A6B00',
    border: '#F5D98A',
    dot: colors.warning,
  },
  danger: {
    bg: colors.dangerMuted,
    color: colors.danger,
    border: '#F5C2C0',
    dot: colors.danger,
  },
  info: {
    bg: colors.infoMuted,
    color: colors.info,
    border: '#B3D4FF',
    dot: colors.info,
  },
};

/**
 * Compact status pill for tables and cards.
 * Prefer domain-specific badges (e.g. ParcelStatusBadge) when labels are domain-bound.
 */
export function StatusBadge({
  children,
  tone = 'neutral',
  withDot = true,
  className,
  style,
}: StatusBadgeProps) {
  const toneStyle = TONE_STYLES[tone];

  return (
    <span
      className={['nb-badge', className].filter(Boolean).join(' ')}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: spacing[1] + 2,
        fontSize: typography.caption.fontSize,
        fontWeight: typography.weights.semibold,
        lineHeight: 1.2,
        padding: `${spacing[1]}px ${spacing[2] + 2}px`,
        borderRadius: radius.badge,
        border: `1px solid ${toneStyle.border}`,
        background: toneStyle.bg,
        color: toneStyle.color,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {withDot ? (
        <span
          aria-hidden
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: toneStyle.dot,
            flexShrink: 0,
          }}
        />
      ) : null}
      {children}
    </span>
  );
}

import { colors, spacing, typography } from '@eveider/config-ui';
import type { ReactNode } from 'react';
import { IconInbox } from './icons.js';

export type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  /** Optional illustration; defaults to inbox. */
  icon?: ReactNode;
  /** Compact variant for table bodies. */
  compact?: boolean;
};

/**
 * Flat empty content with icon + copy — no card chrome (avoids nested panels in tables).
 */
export function EmptyState({
  title,
  description,
  action,
  icon,
  compact = false,
}: EmptyStateProps) {
  const padY = compact ? spacing[8] : spacing[10];

  return (
    <div
      className="nb-empty-state"
      style={{
        textAlign: 'center',
        padding: `${padY}px ${spacing[4]}px`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <div
        aria-hidden
        style={{
          width: compact ? 44 : 52,
          height: compact ? 44 : 52,
          borderRadius: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: colors.surfaceMuted,
          color: colors.textMuted,
          marginBottom: spacing[4],
        }}
      >
        {icon ?? <IconInbox width={compact ? 22 : 24} height={compact ? 22 : 24} />}
      </div>
      <p
        style={{
          margin: 0,
          fontSize: typography.itemTitle.fontSize,
          fontWeight: typography.itemTitle.fontWeight,
          color: colors.secondary,
        }}
      >
        {title}
      </p>
      {description ? (
        <p
          style={{
            margin: `${spacing[2]}px auto 0`,
            maxWidth: 420,
            fontSize: typography.bodySm.fontSize,
            fontWeight: typography.bodySm.fontWeight,
            lineHeight: typography.bodySm.lineHeight,
            color: colors.textMuted,
          }}
        >
          {description}
        </p>
      ) : null}
      {action ? (
        <div style={{ marginTop: spacing[5], display: 'flex', justifyContent: 'center' }}>
          {action}
        </div>
      ) : null}
    </div>
  );
}

import { colors, spacing, typography } from '@eveider/config-ui';
import type { ReactNode } from 'react';
import { Card } from './card.js';

export type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  /** Compact variant for table bodies. */
  compact?: boolean;
};

/**
 * Helpful empty content with optional CTA — prefer over blank panels.
 */
export function EmptyState({ title, description, action, compact = false }: EmptyStateProps) {
  return (
    <Card
      padding={compact ? 'md' : 'lg'}
      style={{
        textAlign: 'center',
        paddingTop: compact ? spacing[8] : spacing[10],
        paddingBottom: compact ? spacing[8] : spacing[10],
      }}
    >
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
    </Card>
  );
}

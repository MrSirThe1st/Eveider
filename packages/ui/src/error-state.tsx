import { colors, spacing, typography } from '@eveider/config-ui';
import type { ReactNode } from 'react';
import { Card } from './card.js';

export type ErrorStateProps = {
  title?: string;
  message: string;
  action?: ReactNode;
  compact?: boolean;
};

/**
 * Full-section error with optional retry CTA — human-readable, not a raw stack.
 */
export function ErrorState({
  title = 'Une erreur est survenue',
  message,
  action,
  compact = false,
}: ErrorStateProps) {
  return (
    <Card
      padding={compact ? 'md' : 'lg'}
      style={{
        textAlign: 'center',
        paddingTop: compact ? spacing[8] : spacing[10],
        paddingBottom: compact ? spacing[8] : spacing[10],
        borderColor: colors.danger,
        background: colors.dangerMuted,
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
      <p
        style={{
          margin: `${spacing[2]}px auto 0`,
          maxWidth: 440,
          fontSize: typography.bodySm.fontSize,
          fontWeight: typography.bodySm.fontWeight,
          lineHeight: typography.bodySm.lineHeight,
          color: colors.textMuted,
        }}
      >
        {message}
      </p>
      {action ? (
        <div style={{ marginTop: spacing[5], display: 'flex', justifyContent: 'center' }}>
          {action}
        </div>
      ) : null}
    </Card>
  );
}

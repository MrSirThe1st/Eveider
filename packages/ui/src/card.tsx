import { colors, radius, spacing, typography, webCardStyle } from '@eveider/config-ui';
import type { CSSProperties, ReactNode } from 'react';

export type CardPadding = 'sm' | 'md' | 'lg' | 'none';

export type CardProps = {
  children: ReactNode;
  padding?: CardPadding;
  className?: string;
  style?: CSSProperties;
  /** Render as interactive surface (hover border). */
  interactive?: boolean;
};

const PADDING: Record<CardPadding, number | undefined> = {
  none: undefined,
  sm: spacing[4],
  md: spacing[5],
  lg: spacing[6],
};

/**
 * Surface container for summaries, lockers, businesses, and list panels.
 */
export function Card({
  children,
  padding = 'md',
  className,
  style,
  interactive = false,
}: CardProps) {
  const pad = PADDING[padding];

  return (
    <div
      className={['nb-card', interactive ? 'nb-card--interactive' : null, className]
        .filter(Boolean)
        .join(' ')}
      style={{
        ...webCardStyle,
        padding: pad,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export type CardHeaderProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  titleId?: string;
};

export function CardHeader({ title, description, action, titleId }: CardHeaderProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: spacing[4],
        marginBottom: spacing[4],
      }}
    >
      <div style={{ minWidth: 0 }}>
        <h2
          id={titleId}
          style={{
            margin: 0,
            fontSize: typography.sectionTitle.fontSize,
            fontWeight: typography.sectionTitle.fontWeight,
            lineHeight: typography.sectionTitle.lineHeight,
            color: colors.secondary,
          }}
        >
          {title}
        </h2>
        {description ? (
          <p
            style={{
              margin: `${spacing[1]}px 0 0`,
              fontSize: typography.bodySm.fontSize,
              fontWeight: typography.bodySm.fontWeight,
              color: colors.textMuted,
            }}
          >
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div style={{ flexShrink: 0 }}>{action}</div> : null}
    </div>
  );
}

import { colors, radius, webCardStyle, webPrimaryButtonStyle, webSecondaryButtonStyle } from '@eveider/config-ui';
import Link from 'next/link';
import type { ReactNode } from 'react';

type ServiceCardAction = {
  label: string;
  href: string;
  external?: boolean;
  variant?: 'primary' | 'secondary';
};

type ServiceCardProps = {
  label: string;
  title: string;
  description: string;
  actions?: ServiceCardAction[];
  badge?: string;
  children?: ReactNode;
};

export function ServiceCard({
  label,
  title,
  description,
  actions = [],
  badge,
  children,
}: ServiceCardProps) {
  return (
    <article
      style={{
        ...webCardStyle,
        padding: '1.75rem',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 280,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <p
          style={{
            margin: 0,
            fontSize: '0.8125rem',
            fontWeight: 600,
            color: colors.textMuted,
          }}
        >
          {label}
        </p>
        {badge ? (
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              padding: '0.25rem 0.5rem',
              borderRadius: radius.button,
              background: colors.background,
              color: colors.secondary,
            }}
          >
            {badge}
          </span>
        ) : null}
      </div>

      <h2
        style={{
          margin: '1rem 0 0',
          fontSize: '1.125rem',
          fontWeight: 700,
          letterSpacing: '-0.01em',
        }}
      >
        {title}
      </h2>

      <p style={{ margin: '0.75rem 0 0', fontWeight: 500, lineHeight: 1.5, flex: 1, color: colors.textMuted }}>
        {description}
      </p>

      {children}

      {actions.length > 0 ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1.5rem' }}>
          {actions.map((action) => {
            const style: React.CSSProperties =
              action.variant === 'primary'
                ? {
                    ...webPrimaryButtonStyle,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: 44,
                    padding: '0 1.25rem',
                    fontSize: '0.875rem',
                    textDecoration: 'none',
                  }
                : {
                    ...webSecondaryButtonStyle,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: 44,
                    padding: '0 1.25rem',
                    fontSize: '0.875rem',
                    textDecoration: 'none',
                  };

            if (action.external) {
              return (
                <a key={action.href + action.label} href={action.href} style={style}>
                  {action.label}
                </a>
              );
            }

            return (
              <Link key={action.href + action.label} href={action.href} style={style}>
                {action.label}
              </Link>
            );
          })}
        </div>
      ) : null}
    </article>
  );
}

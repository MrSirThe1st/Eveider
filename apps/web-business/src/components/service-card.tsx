import { colors, radius } from '@eveider/config-ui';
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

const buttonBase: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: 44,
  padding: '0 1.25rem',
  borderRadius: radius.button,
  fontWeight: 600,
  fontSize: '0.8125rem',
  letterSpacing: '0.04em',
  textDecoration: 'none',
  cursor: 'pointer',
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
        background: colors.surface,
        border: `2px solid ${colors.border}`,
        borderRadius: radius.card,
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
            fontSize: '0.6875rem',
            fontWeight: 600,
            letterSpacing: '0.1em',
            color: colors.secondary,
          }}
        >
          {label}
        </p>
        {badge ? (
          <span
            style={{
              fontSize: '0.6875rem',
              fontWeight: 600,
              letterSpacing: '0.06em',
              padding: '0.25rem 0.5rem',
              border: `2px solid ${colors.border}`,
              borderRadius: 6,
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
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}
      >
        {title}
      </h2>

      <p style={{ margin: '0.75rem 0 0', fontWeight: 500, lineHeight: 1.5, flex: 1 }}>
        {description}
      </p>

      {children}

      {actions.length > 0 ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1.5rem' }}>
          {actions.map((action) => {
            const style: React.CSSProperties = {
              ...buttonBase,
              background: action.variant === 'primary' ? colors.primary : colors.surface,
              color: colors.secondary,
              border:
                action.variant === 'primary' ? 'none' : `2px solid ${colors.border}`,
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

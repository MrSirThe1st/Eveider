import { colors } from '@eveider/config-ui';
import type { ReactNode } from 'react';

export type PageHeaderProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '1rem',
        flexWrap: 'wrap',
        marginBottom: '1.75rem',
      }}
    >
      <div style={{ minWidth: 0 }}>
        <h1
          style={{
            margin: 0,
            fontSize: '1.375rem',
            fontWeight: 700,
            letterSpacing: '0.06em',
            color: colors.secondary,
            lineHeight: 1.2,
            textTransform: 'uppercase',
          }}
        >
          {title}
        </h1>
        {description ? (
          <p
            style={{
              margin: '0.4rem 0 0',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: colors.textMuted,
              lineHeight: 1.45,
              maxWidth: 560,
            }}
          >
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div style={{ flexShrink: 0 }}>{action}</div> : null}
    </header>
  );
}

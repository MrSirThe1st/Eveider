import { colors, spacing, typography } from '@eveider/config-ui';
import Link from 'next/link';
import type { ReactNode } from 'react';

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

export type PageHeaderProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  breadcrumbs?: BreadcrumbItem[];
};

function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Fil d'Ariane" style={{ marginBottom: spacing[3] }}>
      <ol
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: spacing[1],
          margin: 0,
          padding: 0,
          listStyle: 'none',
          fontSize: typography.caption.fontSize,
          fontWeight: typography.weights.semibold,
          lineHeight: typography.caption.lineHeight,
          color: colors.textMuted,
        }}
      >
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li
              key={`${item.label}-${index}`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: spacing[1] }}
            >
              {index > 0 ? <span aria-hidden="true">/</span> : null}
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  style={{
                    color: colors.textMuted,
                    textDecoration: 'none',
                  }}
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  style={{ color: isLast ? colors.secondary : colors.textMuted }}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function PageHeader({ title, description, action, breadcrumbs }: PageHeaderProps) {
  return (
    <header style={{ marginBottom: spacing[7] }}>
      {breadcrumbs && breadcrumbs.length > 0 ? <Breadcrumbs items={breadcrumbs} /> : null}

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: spacing[4],
          flexWrap: 'wrap',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <h1
            style={{
              margin: 0,
              fontSize: typography.pageTitle.fontSize,
              fontWeight: typography.pageTitle.fontWeight,
              letterSpacing: typography.pageTitle.letterSpacing,
              lineHeight: typography.pageTitle.lineHeight,
              color: colors.secondary,
            }}
          >
            {title}
          </h1>
          {description ? (
            <p
              style={{
                margin: `${spacing[2]}px 0 0`,
                fontSize: typography.body.fontSize,
                fontWeight: typography.body.fontWeight,
                lineHeight: typography.body.lineHeight,
                color: colors.textMuted,
                maxWidth: 560,
              }}
            >
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div style={{ flexShrink: 0 }}>{action}</div> : null}
      </div>
    </header>
  );
}

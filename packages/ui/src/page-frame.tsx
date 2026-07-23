import type { CSSProperties, ReactNode } from 'react';
import { PageHeader, type BreadcrumbItem } from './page-header.js';

export type PageFrameProps = {
  title: string;
  description?: string;
  /** Primary page action (button / link group). */
  action?: ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  children: ReactNode;
  style?: CSSProperties;
};

/**
 * Standard page chrome: optional breadcrumbs, title, description, primary action, then content.
 * Use inside AppShell main — do not nest another full-page layout.
 */
export function PageFrame({
  title,
  description,
  action,
  breadcrumbs,
  children,
  style,
}: PageFrameProps) {
  return (
    <div className="page-frame" style={style}>
      <PageHeader
        title={title}
        description={description}
        action={action}
        breadcrumbs={breadcrumbs}
      />
      <div className="page-frame__content">{children}</div>
    </div>
  );
}

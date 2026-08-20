import type { CSSProperties, ReactNode } from 'react';
import { PageHeader, type BreadcrumbItem } from './page-header.js';

export type PageLayout = 'standard' | 'wide' | 'fluid';

export type PageFrameProps = {
  title: string;
  description?: string;
  /** Primary page action (button / link group). */
  action?: ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  /**
   * Content width within the workspace.
   * All layouts fill the main pane; the shell already provides gutters.
   */
  layout?: PageLayout;
  children: ReactNode;
  style?: CSSProperties;
};

const LAYOUT_STYLE: Record<PageLayout, CSSProperties> = {
  standard: { width: '100%', maxWidth: 'none' },
  wide: { width: '100%', maxWidth: 'none' },
  fluid: { width: '100%', maxWidth: 'none' },
};

/**
 * Standard page chrome: optional breadcrumbs, title, description, primary action, then content.
 * Use inside AppShell main — do not nest another full-page layout.
 * Secondary views (tabs, filters) belong in the page body, not in the shell.
 * Header and body share the same left edge and fill the workspace.
 */
export function PageFrame({
  title,
  description,
  action,
  breadcrumbs,
  layout = 'standard',
  children,
  style,
}: PageFrameProps) {
  return (
    <div className={`page-frame page-frame--${layout}`} style={{ ...LAYOUT_STYLE[layout], ...style }}>
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

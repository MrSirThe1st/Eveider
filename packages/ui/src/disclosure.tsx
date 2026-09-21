import { colors } from '@eveider/config-ui';
import type { CSSProperties, ReactNode } from 'react';

export type DisclosureProps = {
  summary: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  style?: CSSProperties;
};

const SUMMARY_STYLE: CSSProperties = {
  cursor: 'pointer',
  fontSize: '0.8125rem',
  fontWeight: 600,
  color: colors.textMuted,
};

/** Native collapsible used on the dashboard (“Activité récente”) and similar secondary blocks. */
export function Disclosure({ summary, children, defaultOpen, style }: DisclosureProps) {
  return (
    <details open={defaultOpen} style={{ marginTop: '0.5rem', ...style }}>
      <summary style={SUMMARY_STYLE}>{summary}</summary>
      {children}
    </details>
  );
}

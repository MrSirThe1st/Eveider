'use client';

import { colors, radius, spacing, typography, shadows, borderSubtle } from '@eveider/config-ui';
import {
  useEffect,
  useId,
  useRef,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { Button } from './button.js';

export type DrawerSide = 'right' | 'left';

export type DrawerProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  side?: DrawerSide;
  /** Panel width. Default 400. */
  width?: number | string;
  className?: string;
  style?: CSSProperties;
};

/**
 * Side panel for contextual exploration without leaving the page.
 * Prefer Modal/ConfirmDialog for blocking decisions.
 */
export function Drawer({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  side = 'right',
  width = 420,
  className,
  style,
}: DrawerProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    document.addEventListener('keydown', onKeyDown);
    panelRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose, open]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="nb-drawer-root"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1100,
      }}
    >
      <button
        type="button"
        aria-label="Fermer"
        className="nb-drawer-backdrop"
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          border: 'none',
          background: 'rgba(18, 18, 18, 0.35)',
          cursor: 'pointer',
        }}
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={['nb-drawer', className].filter(Boolean).join(' ')}
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          [side]: 0,
          width: typeof width === 'number' ? Math.min(width, 560) : width,
          maxWidth: '100vw',
          display: 'flex',
          flexDirection: 'column',
          background: colors.surface,
          borderLeft: side === 'right' ? borderSubtle() : undefined,
          borderRight: side === 'left' ? borderSubtle() : undefined,
          boxShadow: shadows.hard,
          outline: 'none',
          ...style,
        }}
      >
        <header
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: spacing[3],
            padding: `${spacing[5]}px ${spacing[5]}px ${spacing[4]}px`,
            borderBottom: borderSubtle(),
            flexShrink: 0,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <h2
              id={titleId}
              style={{
                margin: 0,
                fontSize: typography.sectionTitle.fontSize,
                fontWeight: typography.sectionTitle.fontWeight,
                color: colors.secondary,
              }}
            >
              {title}
            </h2>
            {description ? (
              <p
                id={descriptionId}
                style={{
                  margin: `${spacing[1]}px 0 0`,
                  fontSize: typography.bodySm.fontSize,
                  color: colors.textMuted,
                }}
              >
                {description}
              </p>
            ) : null}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Fermer">
            ✕
          </Button>
        </header>

        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: spacing[5],
          }}
        >
          {children}
        </div>

        {footer ? (
          <footer
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: spacing[2],
              flexWrap: 'wrap',
              padding: spacing[4],
              borderTop: borderSubtle(),
              flexShrink: 0,
              borderRadius: `0 0 ${radius.card}px 0`,
            }}
          >
            {footer}
          </footer>
        ) : null}
      </aside>
    </div>,
    document.body,
  );
}

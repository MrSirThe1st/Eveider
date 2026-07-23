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

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  /** Footer actions (e.g. Cancel / Confirm). */
  footer?: ReactNode;
  /** Close when clicking the backdrop. Default true. */
  closeOnBackdrop?: boolean;
  /** Max width of the dialog panel. */
  maxWidth?: number | string;
  className?: string;
  style?: CSSProperties;
};

/**
 * Blocking overlay for short forms and confirmations.
 * Prefer Drawer for non-blocking detail exploration.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  closeOnBackdrop = true,
  maxWidth = 480,
  className,
  style,
}: ModalProps) {
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
      className="nb-modal-root"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing[4],
      }}
    >
      <button
        type="button"
        aria-label="Fermer"
        className="nb-modal-backdrop"
        onClick={() => {
          if (closeOnBackdrop) onClose();
        }}
        style={{
          position: 'absolute',
          inset: 0,
          border: 'none',
          background: 'rgba(18, 18, 18, 0.45)',
          cursor: closeOnBackdrop ? 'pointer' : 'default',
        }}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={['nb-modal', className].filter(Boolean).join(' ')}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth,
          maxHeight: 'min(90vh, 720px)',
          overflow: 'auto',
          background: colors.surface,
          borderRadius: radius.card,
          border: borderSubtle(),
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
            gap: spacing[4],
            padding: `${spacing[5]}px ${spacing[5]}px ${spacing[3]}px`,
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
                id={descriptionId}
                style={{
                  margin: `${spacing[2]}px 0 0`,
                  fontSize: typography.bodySm.fontSize,
                  color: colors.textMuted,
                  lineHeight: typography.bodySm.lineHeight,
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

        {children ? (
          <div style={{ padding: `0 ${spacing[5]}px ${spacing[5]}px` }}>{children}</div>
        ) : null}

        {footer ? (
          <footer
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: spacing[2],
              flexWrap: 'wrap',
              padding: `${spacing[4]}px ${spacing[5]}px`,
              borderTop: borderSubtle(),
            }}
          >
            {footer}
          </footer>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

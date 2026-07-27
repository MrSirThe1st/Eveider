'use client';

import { colors, radius, spacing, typography, borderSubtle, shadows } from '@eveider/config-ui';
import Link from 'next/link';
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { IconMoreHorizontal } from './icons.js';

export type DropdownMenuItem = {
  id: string;
  label: string;
  href?: string;
  onClick?: () => void;
  tone?: 'default' | 'danger';
  disabled?: boolean;
};

export type DropdownMenuProps = {
  items: DropdownMenuItem[];
  /** Accessible name for the trigger. */
  label?: string;
  align?: 'start' | 'end';
  trigger?: ReactNode;
  className?: string;
  style?: CSSProperties;
};

/**
 * Contextual actions menu (view / edit / delete).
 * Closes on outside click, Escape, and after selecting an item.
 * Menu panel is portaled to document.body so it is not clipped by scroll containers.
 */
export function DropdownMenu({
  items,
  label = 'Actions',
  align = 'end',
  trigger,
  className,
  style,
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useLayoutEffect(() => {
    if (!open) {
      setMenuPosition(null);
      return;
    }

    function updatePosition() {
      const triggerEl = triggerRef.current;
      if (!triggerEl) return;

      const rect = triggerEl.getBoundingClientRect();
      const menuWidth = menuRef.current?.offsetWidth ?? 180;
      const menuHeight = menuRef.current?.offsetHeight ?? 0;
      const gap = spacing[1];
      const margin = spacing[2];

      let top = rect.bottom + gap;
      if (menuHeight > 0 && top + menuHeight > window.innerHeight - margin) {
        const above = rect.top - menuHeight - gap;
        if (above >= margin) top = above;
      }

      let left = align === 'end' ? rect.right - menuWidth : rect.left;
      left = Math.max(margin, Math.min(left, window.innerWidth - menuWidth - margin));

      setMenuPosition({ top, left });
    }

    updatePosition();
    const frame = requestAnimationFrame(updatePosition);

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, align, items]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  function selectItem(item: DropdownMenuItem) {
    if (item.disabled) return;
    setOpen(false);
    item.onClick?.();
  }

  const menuPanel =
    open && typeof document !== 'undefined' ? (
      <div
        ref={menuRef}
        id={menuId}
        role="menu"
        aria-label={label}
        style={{
          position: 'fixed',
          top: menuPosition?.top ?? 0,
          left: menuPosition?.left ?? 0,
          visibility: menuPosition ? 'visible' : 'hidden',
          zIndex: 50,
          minWidth: 180,
          padding: spacing[1],
          background: colors.surface,
          border: borderSubtle(),
          borderRadius: radius.md,
          boxShadow: shadows.hard,
        }}
      >
        {items.map((item) => {
          const itemStyle: CSSProperties = {
            display: 'block',
            width: '100%',
            textAlign: 'left',
            padding: `${spacing[2]}px ${spacing[3]}px`,
            border: 'none',
            borderRadius: radius.sm,
            background: 'transparent',
            color: item.tone === 'danger' ? colors.danger : colors.secondary,
            fontFamily: typography.fontFamily,
            fontSize: typography.bodySm.fontSize,
            fontWeight: typography.weights.semibold,
            textDecoration: 'none',
            cursor: item.disabled ? 'not-allowed' : 'pointer',
            opacity: item.disabled ? 0.45 : 1,
          };

          if (item.href && !item.disabled) {
            return (
              <Link
                key={item.id}
                href={item.href}
                role="menuitem"
                style={itemStyle}
                onClick={(event) => {
                  event.stopPropagation();
                  selectItem(item);
                }}
              >
                {item.label}
              </Link>
            );
          }

          return (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              style={itemStyle}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                selectItem(item);
              }}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    ) : null;

  return (
    <>
      <div
        ref={rootRef}
        className={['nb-dropdown', className].filter(Boolean).join(' ')}
        style={{ position: 'relative', display: 'inline-flex', ...style }}
      >
        <button
          ref={triggerRef}
          type="button"
          className="nb-dropdown__trigger"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={menuId}
          aria-label={label}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setOpen((current) => !current);
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: spacing.buttonHeightSm,
            height: spacing.buttonHeightSm,
            padding: 0,
            border: borderSubtle(),
            borderRadius: radius.button,
            background: open ? colors.surfaceSubtle : colors.surface,
            color: colors.secondary,
            cursor: 'pointer',
          }}
        >
          {trigger ?? <IconMoreHorizontal />}
        </button>
      </div>
      {menuPanel ? createPortal(menuPanel, document.body) : null}
    </>
  );
}

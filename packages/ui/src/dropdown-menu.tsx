'use client';

import { colors, radius, spacing, typography, borderSubtle, shadows } from '@eveider/config-ui';
import Link from 'next/link';
import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
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
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
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

  return (
    <div
      ref={rootRef}
      className={['nb-dropdown', className].filter(Boolean).join(' ')}
      style={{ position: 'relative', display: 'inline-flex', ...style }}
    >
      <button
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

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          style={{
            position: 'absolute',
            top: `calc(100% + ${spacing[1]}px)`,
            [align === 'end' ? 'right' : 'left']: 0,
            zIndex: 40,
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
      ) : null}
    </div>
  );
}

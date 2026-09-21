'use client';

import { useId, useState, type CSSProperties, type ReactNode } from 'react';
import { IconCheck, IconPencil, IconX } from './icons.js';

export type TableCellStackProps = {
  primary: ReactNode;
  secondary?: ReactNode;
};

/** Identifier-style cell: primary line + muted secondary line. */
export function TableCellStack({ primary, secondary }: TableCellStackProps) {
  return (
    <div className="nb-data-table__stack">
      <div className="nb-data-table__stack-primary">{primary}</div>
      {secondary ? <div className="nb-data-table__stack-secondary">{secondary}</div> : null}
    </div>
  );
}

export type TruncatedTextProps = {
  children: string;
  /** Max width in px. Default 220. */
  maxWidth?: number;
  className?: string;
  style?: CSSProperties;
};

/** Truncates long values and exposes the full string via title + accessible tooltip. */
export function TruncatedText({
  children,
  maxWidth = 220,
  className,
  style,
}: TruncatedTextProps) {
  if (!children) return <span className={className}>—</span>;

  return (
    <span
      className={['nb-data-table__truncate', className].filter(Boolean).join(' ')}
      title={children}
      tabIndex={0}
      style={{ maxWidth, ...style }}
    >
      {children}
    </span>
  );
}

export type InlineEditCellProps = {
  value: string;
  onSave: (next: string) => void | Promise<void>;
  disabled?: boolean;
  ariaLabel?: string;
  placeholder?: string;
};

/**
 * Value + always-visible edit affordance. Clicking edit shows input, save, and cancel.
 * Do not leave cells as permanent inputs.
 */
export function InlineEditCell({
  value,
  onSave,
  disabled = false,
  ariaLabel = 'Modifier',
  placeholder,
}: InlineEditCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const inputId = useId();

  async function save() {
    const next = draft.trim();
    if (!next || next === value) {
      setEditing(false);
      setDraft(value);
      return;
    }
    setSaving(true);
    try {
      await onSave(next);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  function cancel() {
    setDraft(value);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="nb-data-table__inline-edit is-editing">
        <input
          id={inputId}
          className="nb-input nb-data-table__inline-input"
          value={draft}
          placeholder={placeholder}
          aria-label={ariaLabel}
          disabled={saving}
          autoFocus
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void save();
            }
            if (event.key === 'Escape') {
              event.preventDefault();
              cancel();
            }
          }}
        />
        <button
          type="button"
          className="nb-data-table__inline-btn is-save"
          aria-label="Enregistrer"
          disabled={saving}
          onClick={() => void save()}
        >
          <IconCheck width={14} height={14} />
        </button>
        <button
          type="button"
          className="nb-data-table__inline-btn is-cancel"
          aria-label="Annuler"
          disabled={saving}
          onClick={cancel}
        >
          <IconX width={14} height={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="nb-data-table__inline-edit">
      <span className="nb-data-table__inline-value">{value || '—'}</span>
      <button
        type="button"
        className="nb-data-table__inline-btn is-edit"
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={(event) => {
          event.stopPropagation();
          setDraft(value);
          setEditing(true);
        }}
      >
        <IconPencil width={14} height={14} />
      </button>
    </div>
  );
}

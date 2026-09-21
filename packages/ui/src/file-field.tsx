'use client';

import type { CSSProperties, DragEvent, InputHTMLAttributes } from 'react';
import { useEffect, useId, useRef, useState } from 'react';
import { colors, spacing, typography } from '@eveider/config-ui';
import { Button } from './button.js';
import { formatFileSize, isImageFile, rejectDroppedFile } from './file-field-model.js';
import { IconCloudUpload, IconFile } from './icons.js';

export type FileFieldProps = {
  label?: string;
  hint?: string;
  error?: string;
  name?: string;
  id?: string;
  required?: boolean;
  disabled?: boolean;
  accept?: string;
  value?: File | null;
  onChange?: (file: File | null) => void;
  chooseLabel?: string;
  emptyLabel?: string;
  dropLabel?: string;
  browseHint?: string;
  replaceLabel?: string;
  removeLabel?: string;
  maxSizeBytes?: number;
  style?: CSSProperties;
} & Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'className' | 'style' | 'id' | 'type' | 'value' | 'onChange' | 'size'
>;

export function FileField({
  label,
  hint,
  error,
  name,
  id,
  required,
  disabled,
  accept,
  value,
  onChange,
  chooseLabel = 'Parcourir',
  emptyLabel = 'Aucun fichier choisi',
  dropLabel = 'Choisissez un fichier ou déposez-le ici',
  browseHint = 'JPEG, PNG, WebP ou PDF',
  replaceLabel = 'Remplacer',
  removeLabel = 'Retirer',
  maxSizeBytes,
  style,
  ...rest
}: FileFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? name ?? generatedId;
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [rejection, setRejection] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const shownError = error ?? rejection;
  const errorId = shownError ? `${fieldId}-error` : undefined;
  const hintId = !shownError && hint ? `${fieldId}-hint` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;
  const selected = Boolean(value);
  const imagePreview = Boolean(value && previewUrl && isImageFile(value));

  useEffect(() => {
    if (!value || !isImageFile(value)) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(value);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  function openPicker() {
    if (disabled) return;
    inputRef.current?.click();
  }

  function applyFile(file: File | null) {
    if (!file) {
      setRejection(null);
      onChange?.(null);
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    const message = rejectDroppedFile(file, { accept, maxSizeBytes });
    if (message) {
      setRejection(message);
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    setRejection(null);
    onChange?.(file);
  }

  function handleDragEnter(event: DragEvent<HTMLDivElement>) {
    if (disabled) return;
    event.preventDefault();
    event.stopPropagation();
    dragDepth.current += 1;
    setDragging(true);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    if (disabled) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'copy';
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    if (disabled) return;
    event.preventDefault();
    event.stopPropagation();
    dragDepth.current -= 1;
    if (dragDepth.current > 0) return;
    dragDepth.current = 0;
    setDragging(false);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    if (disabled) return;
    event.preventDefault();
    event.stopPropagation();
    dragDepth.current = 0;
    setDragging(false);
    applyFile(event.dataTransfer.files?.[0] ?? null);
  }

  return (
    <div style={style}>
      {label ? (
        <label
          htmlFor={fieldId}
          style={{
            display: 'block',
            fontSize: typography.label.fontSize,
            fontWeight: typography.label.fontWeight,
            lineHeight: typography.label.lineHeight,
            color: colors.secondary,
          }}
        >
          {label}
        </label>
      ) : null}

      <div
        className={[
          'nb-file-field',
          selected ? 'nb-file-field--filled' : null,
          dragging ? 'nb-file-field--dragging' : null,
          shownError ? 'nb-file-field--error' : null,
        ]
          .filter(Boolean)
          .join(' ')}
        style={{ marginTop: label ? spacing[2] : 0 }}
        aria-disabled={disabled || undefined}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={(event) => {
          if (disabled || selected) return;
          if ((event.target as HTMLElement).closest('button')) return;
          openPicker();
        }}
      >
        <input
          {...rest}
          ref={inputRef}
          id={fieldId}
          className="nb-file-field__input"
          type="file"
          name={name}
          accept={accept}
          required={required && !value}
          disabled={disabled}
          aria-invalid={shownError ? true : undefined}
          aria-describedby={describedBy}
          aria-label={label ? undefined : emptyLabel}
          onChange={(event) => {
            applyFile(event.target.files?.[0] ?? null);
          }}
        />

        {selected && value ? (
          <div className="nb-file-field__preview">
            {imagePreview ? (
              <img src={previewUrl ?? undefined} alt="" className="nb-file-field__thumb" />
            ) : (
              <span className="nb-file-field__file-icon" aria-hidden>
                <IconFile width={22} height={22} />
              </span>
            )}
            <div className="nb-file-field__meta">
              <span className="nb-file-field__name">{value.name}</span>
              <span className="nb-file-field__size">{formatFileSize(value.size)}</span>
              <div className="nb-file-field__actions">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={disabled}
                  onClick={openPicker}
                >
                  {replaceLabel}
                </Button>
                <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={() => applyFile(null)}>
                  {removeLabel}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="nb-file-field__empty">
            <IconCloudUpload
              className="nb-file-field__cloud"
              width={48}
              height={48}
              strokeWidth={1.5}
              aria-hidden
            />
            <p className="nb-file-field__title">{dragging ? 'Déposez le fichier ici' : dropLabel}</p>
            <p className="nb-file-field__subtitle">{browseHint}</p>
            <Button
              type="button"
              variant="primary"
              size="sm"
              className="nb-file-field__browse"
              disabled={disabled}
              onClick={openPicker}
            >
              {chooseLabel}
            </Button>
          </div>
        )}
      </div>

      {shownError ? (
        <p id={errorId} className="nb-field-error" role="alert">
          {shownError}
        </p>
      ) : selected && hint ? (
        <p id={hintId} className="nb-field-hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

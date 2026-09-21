import { describe, expect, it } from 'vitest';
import {
  fileMatchesAccept,
  formatFileFieldSelection,
  formatFileSize,
  isImageFile,
  rejectDroppedFile,
} from './file-field-model.js';

describe('formatFileSize', () => {
  it('uses whole megabytes without a decimal', () => {
    expect(formatFileSize(5 * 1024 * 1024)).toBe('5 Mo');
  });
});

describe('formatFileFieldSelection', () => {
  it('shows a placeholder when nothing is selected', () => {
    expect(formatFileFieldSelection(null)).toBe('Aucun fichier choisi');
  });

  it('shows the file name and a French size', () => {
    expect(formatFileFieldSelection({ name: 'carte.jpg', size: 240_000 })).toBe('carte.jpg · 234 Ko');
    expect(formatFileFieldSelection({ name: 'dossier.pdf', size: 1.5 * 1024 * 1024 })).toBe(
      'dossier.pdf · 1,5 Mo',
    );
  });
});

describe('isImageFile', () => {
  it('treats image MIME types and photo extensions as images', () => {
    expect(isImageFile({ type: 'image/jpeg', name: 'id.bin' })).toBe(true);
    expect(isImageFile({ type: '', name: 'recto.webp' })).toBe(true);
    expect(isImageFile({ type: 'application/pdf', name: 'recto.pdf' })).toBe(false);
  });
});

describe('fileMatchesAccept', () => {
  const accept = 'image/jpeg,image/png,image/webp,application/pdf';

  it('accepts listed MIME types and extensions', () => {
    expect(fileMatchesAccept({ type: 'image/png', name: 'id.png' }, accept)).toBe(true);
    expect(fileMatchesAccept({ type: 'application/pdf', name: 'id.pdf' }, accept)).toBe(true);
    expect(fileMatchesAccept({ type: '', name: 'id.jpg' }, '.jpg,.pdf')).toBe(true);
    expect(fileMatchesAccept({ type: 'image/gif', name: 'id.gif' }, 'image/*')).toBe(true);
  });

  it('rejects other types', () => {
    expect(fileMatchesAccept({ type: 'text/plain', name: 'notes.txt' }, accept)).toBe(false);
  });
});

describe('rejectDroppedFile', () => {
  it('rejects the wrong type or an oversized file', () => {
    expect(
      rejectDroppedFile(
        { name: 'notes.txt', type: 'text/plain', size: 12 },
        { accept: 'image/jpeg,application/pdf' },
      ),
    ).toBe('Format non accepté');
    expect(
      rejectDroppedFile(
        { name: 'id.jpg', type: 'image/jpeg', size: 6 * 1024 * 1024 },
        { accept: 'image/jpeg', maxSizeBytes: 5 * 1024 * 1024 },
      ),
    ).toBe('Fichier trop volumineux (5 Mo max)');
  });

  it('accepts a valid file', () => {
    expect(
      rejectDroppedFile(
        { name: 'id.jpg', type: 'image/jpeg', size: 120_000 },
        { accept: 'image/jpeg', maxSizeBytes: 5 * 1024 * 1024 },
      ),
    ).toBeNull();
  });
});

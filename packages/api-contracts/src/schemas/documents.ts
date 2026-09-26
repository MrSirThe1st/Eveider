import { z } from 'zod';

export const IDENTITY_DOCUMENTS_BUCKET = 'identity-documents';
export const STORED_DOCUMENT_SCHEME = 'eveider://';

export const IDENTITY_DOCUMENT_KINDS = [
  'driver_id',
  'driver_profile',
  'legal_rep_id',
  'national_id',
  'rccm_certificate',
  'nif_certificate',
  'selfie',
  'vehicle',
] as const;

export const MAX_DRIVER_VEHICLE_DOCUMENTS = 8;

export type IdentityDocumentKind = (typeof IDENTITY_DOCUMENT_KINDS)[number];

export type StoredDocumentRef = {
  bucket: string;
  objectPath: string;
};

export function buildStoredDocumentRef(objectPath: string): string {
  const trimmed = objectPath.replace(/^\/+/, '');
  return `${STORED_DOCUMENT_SCHEME}${IDENTITY_DOCUMENTS_BUCKET}/${trimmed}`;
}

export function parseStoredDocumentRef(value: string): StoredDocumentRef | null {
  const trimmed = value.trim();
  const prefix = `${STORED_DOCUMENT_SCHEME}${IDENTITY_DOCUMENTS_BUCKET}/`;
  if (!trimmed.startsWith(prefix)) return null;
  const objectPath = trimmed.slice(prefix.length).replace(/^\/+/, '');
  if (!objectPath || objectPath.includes('..') || objectPath.includes('\\')) return null;
  return { bucket: IDENTITY_DOCUMENTS_BUCKET, objectPath };
}

export function isStoredDocumentRef(value: string): boolean {
  return parseStoredDocumentRef(value) !== null;
}

export function isLegacyDocumentUrl(value: string): boolean {
  return /^https:\/\//i.test(value.trim());
}

export function documentViewPath(stored: string): string {
  const trimmed = stored.trim();
  if (isLegacyDocumentUrl(trimmed)) return trimmed;
  const parsed = parseStoredDocumentRef(trimmed);
  if (!parsed) return trimmed;
  return `/api/documents/${parsed.objectPath.split('/').map(encodeURIComponent).join('/')}`;
}

export function isImageDocumentPath(stored: string, fileName?: string | null): boolean {
  const target = `${fileName ?? ''} ${stored}`.toLowerCase();
  return /\.(jpe?g|png|gif|webp|bmp)(\?|#|$|\b)/i.test(target);
}

export function identityDocumentFileName(stored: string, ownerName: string): string {
  const slug =
    ownerName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'chauffeur';
  const match = `${stored}`.toLowerCase().match(/\.(jpe?g|png|gif|webp|bmp|pdf)(?:\?|#|$)/i);
  const ext = match?.[1] === 'jpeg' ? 'jpg' : (match?.[1] ?? 'bin');
  return `piece-identite-${slug}.${ext}`;
}

export const driverVehicleDocumentIdSchema = z.string().uuid('Document introuvable');

export const storedDocumentRefSchema = z
  .string()
  .min(1, 'Pièce d’identité requise')
  .refine(
    (value) => isStoredDocumentRef(value) || isLegacyDocumentUrl(value),
    'Pièce d’identité invalide',
  );

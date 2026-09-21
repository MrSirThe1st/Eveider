import {
  buildStoredDocumentRef,
  IDENTITY_DOCUMENTS_BUCKET,
  parseStoredDocumentRef,
  type IdentityDocumentKind,
} from '@eveider/api-contracts';
import { randomUUID } from 'node:crypto';
import { createSupabaseAdminClient } from '../supabase/server.js';

export const MAX_IDENTITY_DOCUMENT_BYTES = 5 * 1024 * 1024;
export const MIN_IDENTITY_DOCUMENT_BYTES = 32;

export const ALLOWED_IDENTITY_DOCUMENT_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const;

export type IdentityDocumentMimeType = (typeof ALLOWED_IDENTITY_DOCUMENT_MIME_TYPES)[number];

const MIME_EXTENSION: Record<IdentityDocumentMimeType, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
};

export type ValidatedIdentityDocument = {
  bytes: Uint8Array;
  mimeType: IdentityDocumentMimeType;
  extension: string;
  fileName: string;
};

export function sniffIdentityDocumentMime(bytes: Uint8Array): IdentityDocumentMimeType | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return 'image/png';
  }
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp';
  }
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return 'application/pdf';
  }
  return null;
}

function sanitizeFileName(fileName: string, extension: string): string {
  const base = fileName
    .trim()
    .replace(/\\/g, '/')
    .split('/')
    .pop()
    ?.replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return `${base || 'piece'}${extension}`;
}

export function validateIdentityDocumentFile(input: {
  bytes: Uint8Array;
  fileName: string;
  declaredMimeType?: string;
  tooSmallError?: string;
}): ValidatedIdentityDocument {
  const { bytes, fileName, declaredMimeType } = input;
  if (bytes.length < MIN_IDENTITY_DOCUMENT_BYTES) {
    throw new Error(input.tooSmallError ?? 'Pièce d’identité requise');
  }
  if (bytes.length > MAX_IDENTITY_DOCUMENT_BYTES) {
    throw new Error('Fichier trop volumineux (5 Mo max)');
  }

  const mimeType = sniffIdentityDocumentMime(bytes);
  if (!mimeType) {
    throw new Error('Format non accepté — JPEG, PNG, WebP ou PDF');
  }
  if (
    declaredMimeType &&
    declaredMimeType !== 'application/octet-stream' &&
    declaredMimeType !== mimeType
  ) {
    throw new Error('Format non accepté — JPEG, PNG, WebP ou PDF');
  }

  const extension = MIME_EXTENSION[mimeType];
  return {
    bytes,
    mimeType,
    extension,
    fileName: sanitizeFileName(fileName, extension),
  };
}

export function buildIdentityDocumentObjectPath(
  kind: IdentityDocumentKind,
  uploadedByUserId: string,
  extension: string,
  id = randomUUID(),
): string {
  const safeUser = uploadedByUserId.replace(/[^a-zA-Z0-9_-]/g, '') || 'user';
  return `${kind}/${safeUser}/${id}${extension}`;
}

export type UploadedIdentityDocument = {
  storedRef: string;
  objectPath: string;
  fileName: string;
  mimeType: IdentityDocumentMimeType;
};

async function ensureIdentityDocumentsBucket(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
) {
  const { data } = await supabase.storage.getBucket(IDENTITY_DOCUMENTS_BUCKET);
  if (data) return;

  const { error } = await supabase.storage.createBucket(IDENTITY_DOCUMENTS_BUCKET, {
    public: false,
    fileSizeLimit: MAX_IDENTITY_DOCUMENT_BYTES,
    allowedMimeTypes: [...ALLOWED_IDENTITY_DOCUMENT_MIME_TYPES],
  });
  if (error && !/already exists/i.test(error.message)) {
    throw new Error('Stockage des pièces indisponible');
  }
}

export async function uploadIdentityDocument(input: {
  bytes: Uint8Array;
  fileName: string;
  declaredMimeType?: string;
  kind: IdentityDocumentKind;
  uploadedByUserId: string;
  tooSmallError?: string;
}): Promise<UploadedIdentityDocument> {
  const validated = validateIdentityDocumentFile({
    bytes: input.bytes,
    fileName: input.fileName,
    declaredMimeType: input.declaredMimeType,
    tooSmallError: input.tooSmallError,
  });
  const objectPath = buildIdentityDocumentObjectPath(
    input.kind,
    input.uploadedByUserId,
    validated.extension,
  );
  const supabase = createSupabaseAdminClient();
  await ensureIdentityDocumentsBucket(supabase);

  const { error } = await supabase.storage.from(IDENTITY_DOCUMENTS_BUCKET).upload(objectPath, validated.bytes, {
    contentType: validated.mimeType,
    upsert: false,
  });
  if (error) {
    throw new Error('Impossible d’enregistrer la pièce');
  }

  return {
    storedRef: buildStoredDocumentRef(objectPath),
    objectPath,
    fileName: validated.fileName,
    mimeType: validated.mimeType,
  };
}

export async function downloadIdentityDocument(storedRef: string): Promise<{
  bytes: Uint8Array;
  mimeType: IdentityDocumentMimeType;
  fileName: string;
}> {
  const parsed = parseStoredDocumentRef(storedRef);
  if (!parsed) {
    throw new Error('Pièce introuvable');
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage.from(parsed.bucket).download(parsed.objectPath);
  if (error || !data) {
    throw new Error('Pièce introuvable');
  }

  const bytes = new Uint8Array(await data.arrayBuffer());
  const mimeType = sniffIdentityDocumentMime(bytes);
  if (!mimeType) {
    throw new Error('Pièce introuvable');
  }

  const fileName = parsed.objectPath.split('/').pop() ?? `piece${MIME_EXTENSION[mimeType]}`;
  return { bytes, mimeType, fileName };
}

export function storedRefFromObjectPath(objectPath: string): string {
  return buildStoredDocumentRef(objectPath);
}

export async function removeStoredDocument(storedRef: string): Promise<void> {
  const parsed = parseStoredDocumentRef(storedRef);
  if (!parsed) return;
  const supabase = createSupabaseAdminClient();
  await supabase.storage.from(parsed.bucket).remove([parsed.objectPath]);
}

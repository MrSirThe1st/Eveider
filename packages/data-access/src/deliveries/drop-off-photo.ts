const MAX_PHOTO_BYTES = 800_000;

export function normalizeDropOffPhoto(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error('Photo de dépôt requise');
  }

  const comma = trimmed.indexOf(',');
  const base64 = (comma >= 0 ? trimmed.slice(comma + 1) : trimmed).replace(/\s/g, '');
  let bytes: Buffer;
  try {
    bytes = Buffer.from(base64, 'base64');
  } catch {
    throw new Error('Photo de dépôt invalide');
  }

  if (bytes.length < 32 || bytes.length > MAX_PHOTO_BYTES) {
    throw new Error('Photo de dépôt invalide — taille incorrecte');
  }

  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8;
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  if (!isJpeg && !isPng) {
    throw new Error('Photo de dépôt invalide — JPEG ou PNG requis');
  }

  const mime = isJpeg ? 'image/jpeg' : 'image/png';
  return `data:${mime};base64,${base64}`;
}

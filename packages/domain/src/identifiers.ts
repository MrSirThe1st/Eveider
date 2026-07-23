/**
 * Crockford Base32 alphabet (no I, L, O, U — safer for voice / OCR / barcodes).
 * @see https://www.crockford.com/base32.html
 */
export const CROCKFORD_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

const CHECK_ALPHABET = `${CROCKFORD_ALPHABET}*~$=`;

export const TRACKING_NUMBER_PREFIX = 'EVD';
export const POINT_CODE_PREFIX = 'EVP';

/** EVD + YY + 8 body + 1 check → 14 chars */
export const TRACKING_NUMBER_PATTERN = /^EVD\d{2}[0-9A-HJKMNP-TV-Z]{8}[0-9A-HJKMNP-TV-Z*~$=]$/;

/** EVP + 6 body + 1 check → 10 chars */
export const POINT_CODE_PATTERN = /^EVP[0-9A-HJKMNP-TV-Z]{6}[0-9A-HJKMNP-TV-Z*~$=]$/;

function normalizeCrockford(input: string): string {
  return input
    .trim()
    .toUpperCase()
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1');
}

function secureRandomBytes(length: number): Uint8Array {
  const out = new Uint8Array(length);
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(out);
    return out;
  }
  // Extremely unlikely fallback (non-crypto) — generation should run on Node/Web Crypto hosts.
  for (let i = 0; i < length; i++) {
    out[i] = Math.floor(Math.random() * 256);
  }
  return out;
}

function randomCrockford(length: number): string {
  const bytes = secureRandomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += CROCKFORD_ALPHABET[bytes[i]! % 32]!;
  }
  return out;
}

/** Inclusive min, exclusive max — crypto-backed when available. */
function secureRandomInt(minInclusive: number, maxExclusive: number): number {
  const range = maxExclusive - minInclusive;
  if (range <= 0) throw new Error('Invalid random range');
  const bytes = secureRandomBytes(4);
  const value = ((bytes[0]! << 24) | (bytes[1]! << 16) | (bytes[2]! << 8) | bytes[3]!) >>> 0;
  return minInclusive + (value % range);
}

/** Crockford mod-37 check symbol over the payload (excluding the check itself). */
export function crockfordCheckSymbol(payload: string): string {
  let sum = 0;
  const normalized = normalizeCrockford(payload);
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i]!;
    const value = CROCKFORD_ALPHABET.indexOf(char);
    if (value < 0) {
      throw new Error(`Caractère invalide dans l’identifiant: ${char}`);
    }
    sum = (sum * 32 + value) % 37;
  }
  return CHECK_ALPHABET[sum]!;
}

export function isValidCrockfordChecksum(value: string): boolean {
  const normalized = normalizeCrockford(value);
  if (normalized.length < 2) return false;
  const payload = normalized.slice(0, -1);
  const check = normalized.slice(-1);
  try {
    return crockfordCheckSymbol(payload) === check;
  } catch {
    return false;
  }
}

function twoDigitYear(date = new Date()): string {
  return String(date.getUTCFullYear() % 100).padStart(2, '0');
}

/** Public parcel tracking number, barcode/QR friendly. Example: EVD26A7K3M2PX */
export function generateTrackingNumber(date = new Date()): string {
  const payload = `${TRACKING_NUMBER_PREFIX}${twoDigitYear(date)}${randomCrockford(8)}`;
  return `${payload}${crockfordCheckSymbol(payload)}`;
}

export function normalizeTrackingNumber(value: string): string {
  return normalizeCrockford(value);
}

export function isValidTrackingNumber(value: string): boolean {
  const normalized = normalizeTrackingNumber(value);
  return TRACKING_NUMBER_PATTERN.test(normalized) && isValidCrockfordChecksum(normalized);
}

/** Global Eveider Point code. Example: EVPA7K3M2X */
export function generatePointCode(): string {
  const payload = `${POINT_CODE_PREFIX}${randomCrockford(6)}`;
  return `${payload}${crockfordCheckSymbol(payload)}`;
}

export function normalizePointCode(value: string): string {
  return normalizeCrockford(value);
}

export function isValidPointCode(value: string): boolean {
  const normalized = normalizePointCode(value);
  return POINT_CODE_PATTERN.test(normalized) && isValidCrockfordChecksum(normalized);
}

/** 6-digit locker PIN (100000–999999), crypto-strong when Web Crypto is available. */
export function generatePickupPinCode(): string {
  return String(secureRandomInt(100_000, 1_000_000));
}

/** Optional QR payload for a compartment door: `{pointCode}/{label}` */
export function buildCompartmentQrPayload(pointCode: string, compartmentLabel: string): string {
  return `${normalizePointCode(pointCode)}/${compartmentLabel.trim().toUpperCase()}`;
}

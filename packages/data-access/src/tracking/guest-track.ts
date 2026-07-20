import { createHmac, timingSafeEqual } from 'node:crypto';

const TRACK_TOKEN_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

export type GuestTrackPayload = {
  parcelId: string;
  phone: string;
  exp: number;
};

/** Digits-only phone for matching (WhatsApp / PawaPay style). */
export function normalizeTrackPhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

export function phonesMatch(a: string, b: string): boolean {
  const na = normalizeTrackPhone(a);
  const nb = normalizeTrackPhone(b);
  if (!na || !nb) return false;
  if (na === nb || na.endsWith(nb) || nb.endsWith(na)) return true;
  // DRC local vs international: 08… vs +2438…
  const ta = na.replace(/^0+/, '').slice(-9);
  const tb = nb.replace(/^0+/, '').slice(-9);
  return ta.length >= 8 && ta === tb;
}

function getTrackSecret(): string {
  return (
    process.env.TRACK_TOKEN_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    'eveider-dev-track-secret'
  );
}

function toBase64Url(value: string | Buffer): string {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function fromBase64Url(value: string): Buffer {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
  return Buffer.from(padded + pad, 'base64');
}

function sign(body: string): string {
  return toBase64Url(createHmac('sha256', getTrackSecret()).update(body).digest());
}

export function createGuestTrackToken(parcelId: string, phone: string, ttlMs = TRACK_TOKEN_TTL_MS): string {
  const payload: GuestTrackPayload = {
    parcelId,
    phone: normalizeTrackPhone(phone),
    exp: Date.now() + ttlMs,
  };
  const body = toBase64Url(JSON.stringify(payload));
  return `${body}.${sign(body)}`;
}

export function verifyGuestTrackToken(token: string): GuestTrackPayload | null {
  const [body, signature] = token.split('.');
  if (!body || !signature) return null;

  const expected = sign(body);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(fromBase64Url(body).toString('utf8')) as GuestTrackPayload;
    if (!payload.parcelId || !payload.phone || typeof payload.exp !== 'number') return null;
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

import { timingSafeEqual } from 'node:crypto';

const ENV_KEY = 'EVEIDER_LOCKER_API_TOKENS';

export type LockerApiTokenMap = Record<string, string>;

function secretsEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) {
    timingSafeEqual(left, left);
    return false;
  }
  return timingSafeEqual(left, right);
}

export function parseLockerApiTokens(raw: string | undefined = process.env[ENV_KEY]): LockerApiTokenMap {
  const value = raw?.trim();
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: LockerApiTokenMap = {};
    for (const [lockerId, token] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof token === 'string' && token.trim() && lockerId.trim()) {
        out[lockerId.trim()] = token.trim();
      }
    }
    return out;
  } catch {
    return {};
  }
}

/**
 * Resolve which SMART_LOCKER the hardware client is. Tokens are per-locker
 * so a client cannot claim another locker's identity.
 */
export function resolveLockerIdForApiToken(
  token: string,
  tokens: LockerApiTokenMap = parseLockerApiTokens(),
): string | null {
  const provided = token.trim();
  if (!provided) return null;
  let matched: string | null = null;
  for (const [lockerId, secret] of Object.entries(tokens)) {
    if (secretsEqual(provided, secret)) {
      matched = lockerId;
    }
  }
  return matched;
}

export const LOCKER_API_TOKEN_ENV = ENV_KEY;

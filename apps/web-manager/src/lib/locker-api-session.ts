import {
  lockerMaintenanceTokenMatches,
  parseLockerApiTokens,
  resolveLockerIdForApiToken,
} from '@eveider/data-access';

export type LockerApiAuth =
  | { lockerId: string }
  | { error: string; status: number };

function bearerToken(request: Request): string | null {
  const header = request.headers.get('authorization') ?? request.headers.get('Authorization');
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();
  return token || null;
}

/**
 * Hardware Node-RED / locker client auth.
 *
 * Tokens live in env `EVEIDER_LOCKER_API_TOKENS` as JSON `{ "<lockerUuid>": "<secret>" }`.
 * The matched locker id is the only locker the client may act on.
 */
export function requireLockerApi(request: Request): LockerApiAuth {
  const token = bearerToken(request);
  if (!token) {
    return { error: 'LOCKER_AUTH_REQUIRED', status: 401 };
  }
  const tokens = parseLockerApiTokens();
  const lockerId = resolveLockerIdForApiToken(token, tokens);
  if (!lockerId) {
    return { error: 'LOCKER_AUTH_REQUIRED', status: 401 };
  }
  return { lockerId };
}

export type LockerMaintenanceAuth = { ok: true } | { error: string; status: number };

export function requireLockerMaintenance(request: Request): LockerMaintenanceAuth {
  const token = bearerToken(request);
  if (!token) {
    return { error: 'LOCKER_MAINTENANCE_AUTH_REQUIRED', status: 401 };
  }
  if (!lockerMaintenanceTokenMatches(token)) {
    return { error: 'LOCKER_MAINTENANCE_AUTH_REQUIRED', status: 401 };
  }
  return { ok: true };
}

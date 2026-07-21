import type { User } from '@supabase/supabase-js';

/** How long a validated Supabase user / DB profile may be reused within this process. */
const USER_TTL_MS = 60_000;
const PROFILE_TTL_MS = 60_000;

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

type ProfileScope = 'admin' | 'business';

const validatedUsers = new Map<string, CacheEntry<User>>();
const profiles = new Map<string, CacheEntry<unknown>>();

function profileKey(authId: string, scope: ProfileScope) {
  return `${scope}:${authId}`;
}

function getEntry<T>(map: Map<string, CacheEntry<T>>, key: string): T | null {
  const entry = map.get(key);
  if (!entry) return null;
  if (Date.now() >= entry.expiresAt) {
    map.delete(key);
    return null;
  }
  return entry.value;
}

function setEntry<T>(map: Map<string, CacheEntry<T>>, key: string, value: T, ttlMs: number) {
  map.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function getCachedValidatedUser(authId: string): User | null {
  return getEntry(validatedUsers, authId);
}

export function setCachedValidatedUser(user: User) {
  setEntry(validatedUsers, user.id, user, USER_TTL_MS);
}

export function getCachedProfile<T>(authId: string, scope: ProfileScope): T | null {
  return getEntry(profiles, profileKey(authId, scope)) as T | null;
}

export function setCachedProfile<T>(authId: string, scope: ProfileScope, profile: T) {
  setEntry(profiles, profileKey(authId, scope), profile, PROFILE_TTL_MS);
}

/** Call after role-changing mutations if immediate consistency is required. */
export function invalidateAuthCache(authId: string) {
  validatedUsers.delete(authId);
  profiles.delete(profileKey(authId, 'admin'));
  profiles.delete(profileKey(authId, 'business'));
}

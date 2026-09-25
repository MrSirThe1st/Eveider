/** Canonical portal origin for auth redirect URLs (email change, password reset). */
export function getPortalOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_PORTAL_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  return 'http://localhost:3000';
}

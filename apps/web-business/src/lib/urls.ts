export function getAdminPortalUrl(): string {
  return process.env.NEXT_PUBLIC_ADMIN_URL ?? 'http://localhost:3000';
}

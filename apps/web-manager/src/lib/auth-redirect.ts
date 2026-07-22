import { redirect } from 'next/navigation';
import { getAuthenticatedLandingPath } from '@/lib/auth-routing';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import type { UserRole } from '@eveider/domain';

export async function getAuthenticatedRedirectPath(): Promise<string | null> {
  const current = await getCurrentUser();
  if (!current) return null;
  return getAuthenticatedLandingPath(current.profile.role as UserRole);
}

export async function redirectIfAuthenticated() {
  const path = await getAuthenticatedRedirectPath();
  if (path) {
    redirect(path);
  }
}

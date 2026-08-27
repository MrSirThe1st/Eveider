import { redirect } from 'next/navigation';
import { getLandingPathForUser } from '@/lib/auth-routing';
import { getCurrentUser } from '@/lib/auth/get-current-user';

export async function getAuthenticatedRedirectPath(): Promise<string | null> {
  const current = await getCurrentUser();
  if (!current) return null;
  return getLandingPathForUser(current);
}

export async function redirectIfAuthenticated() {
  const path = await getAuthenticatedRedirectPath();
  if (path) {
    redirect(path);
  }
}

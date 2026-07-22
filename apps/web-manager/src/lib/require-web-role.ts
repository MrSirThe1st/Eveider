import { getAuthenticatedLandingPath } from '@/lib/auth-routing';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import type { UserRole } from '@eveider/domain';
import { redirect } from 'next/navigation';

export async function requireWebRole(allowedRoles: readonly UserRole[]) {
  const current = await getCurrentUser();

  if (!current) {
    redirect('/connexion');
  }

  const profile = current.profile;

  if (!allowedRoles.includes(profile.role as UserRole)) {
    const fallback = getAuthenticatedLandingPath(profile.role as UserRole);
    if (fallback && fallback !== '/') {
      redirect(fallback);
    }
    redirect('/connexion');
  }

  return profile;
}

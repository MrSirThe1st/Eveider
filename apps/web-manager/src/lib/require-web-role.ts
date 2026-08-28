import { getAuthenticatedLandingPath, getWebPersona } from '@/lib/auth-routing';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import type { UserRole } from '@eveider/domain';
import { redirect } from 'next/navigation';

export async function requireWebRole(allowedRoles: readonly UserRole[]) {
  const current = await getCurrentUser();

  if (!current) {
    redirect('/connexion');
  }

  const persona = getWebPersona(current);
  if (!persona || !allowedRoles.includes(persona)) {
    const fallback = persona ? getAuthenticatedLandingPath(persona) : null;
    if (fallback && fallback !== '/') {
      redirect(fallback);
    }
    redirect('/connexion');
  }

  return current.profile;
}

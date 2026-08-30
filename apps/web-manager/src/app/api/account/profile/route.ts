import { fail, ok, updateAccountProfileSchema } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import {
  hasOrganizationWebAccess,
  hasPlatformDashboardAccess,
} from '@eveider/domain';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-current-user';

export async function PATCH(request: Request) {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json(fail('Non authentifié'), { status: 401 });
  }

  const memberships = current.memberships.map((membership) => ({
    organizationId: membership.businessId,
    role: membership.role,
    isPlatformOrg: membership.isPlatformOrg,
  }));

  const isAdmin = hasPlatformDashboardAccess(current.profile.platformRole, memberships);
  const isOrg = hasOrganizationWebAccess(memberships);
  if (!isAdmin && !isOrg) {
    return NextResponse.json(fail('Accès refusé'), { status: 403 });
  }

  const body = updateAccountProfileSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(fail(body.error.errors[0]?.message ?? 'Données invalides'), {
      status: 400,
    });
  }

  try {
    const { users } = createRepositories();
    const updated = await users.updateProfile(current.profile.id, {
      fullName: body.data.fullName,
    });
    return NextResponse.json(ok({ fullName: updated.fullName }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json(fail(message), { status: 500 });
  }
}

import { fail, ok, updateAccountProfileSchema } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import {
  hasOrganizationWebAccess,
  hasPlatformDashboardAccess,
} from '@eveider/domain';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-current-user';
import { requireAccountSession, withMobileCors } from '@/lib/mobile-session';

export async function OPTIONS() {
  return withMobileCors(new NextResponse(null, { status: 204 }));
}

async function resolveProfileActor(request: Request) {
  const bearer = request.headers.get('Authorization')?.startsWith('Bearer ');
  if (bearer) {
    const auth = await requireAccountSession(request);
    if ('error' in auth) {
      return { error: auth.error ?? 'Non authentifié', status: auth.status } as const;
    }
    return { profile: auth.session.profile, allowPhone: true } as const;
  }

  const current = await getCurrentUser();
  if (!current) {
    return { error: 'Non authentifié', status: 401 } as const;
  }

  const memberships = current.memberships.map((membership) => ({
    organizationId: membership.businessId,
    role: membership.role,
    isPlatformOrg: membership.isPlatformOrg,
  }));

  const isAdmin = hasPlatformDashboardAccess(current.profile.platformRole, memberships);
  const isOrg = hasOrganizationWebAccess(memberships);
  if (!isAdmin && !isOrg) {
    return { error: 'Accès refusé', status: 403 } as const;
  }

  return { profile: current.profile, allowPhone: false } as const;
}

export async function PATCH(request: Request) {
  const actor = await resolveProfileActor(request);
  if ('error' in actor) {
    return withMobileCors(
      NextResponse.json(fail(actor.error ?? 'Non authentifié'), { status: actor.status }),
    );
  }

  const body = updateAccountProfileSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return withMobileCors(
      NextResponse.json(fail(body.error.errors[0]?.message ?? 'Données invalides'), {
        status: 400,
      }),
    );
  }

  try {
    const { users } = createRepositories();
    const phone = actor.allowPhone ? body.data.phone?.trim() : undefined;

    if (phone) {
      const existing = await users.findCustomerByPhone(phone);
      if (existing && existing.id !== actor.profile.id) {
        return withMobileCors(
          NextResponse.json(fail('Ce numéro de téléphone est déjà utilisé'), { status: 409 }),
        );
      }
    }

    const updated = await users.updateProfile(actor.profile.id, {
      fullName: body.data.fullName,
      ...(phone !== undefined ? { phone } : {}),
    });

    return withMobileCors(
      NextResponse.json(
        ok({
          fullName: updated.fullName,
          phone: updated.phone,
        }),
      ),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return withMobileCors(NextResponse.json(fail(message), { status: 500 }));
  }
}

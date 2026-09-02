import { fail, ok, updateEveiderTeamMemberRoleSchema } from '@eveider/api-contracts';
import { AccessDeniedError, createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/session';
import { requirePlatformOrganizationId, withPlatformOrgContext } from '@/server/platform-staff';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdminSession();
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const { id } = await context.params;
  const body = updateEveiderTeamMemberRoleSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(fail(body.error.errors[0]?.message ?? 'Données invalides'), {
      status: 400,
    });
  }

  try {
    const platformOrgId = await requirePlatformOrganizationId();
    const platformCtx = withPlatformOrgContext(auth.session.ctx, platformOrgId);
    const { memberships, teamInvites } = createRepositories();
    const membership = await memberships.find(id, platformOrgId);
    if (!membership || membership.role !== 'driver') {
      return NextResponse.json(fail('Chauffeur introuvable'), { status: 404 });
    }
    if (body.data.role !== 'dispatcher') {
      return NextResponse.json(fail('Rôle non pris en charge'), { status: 400 });
    }
    await teamInvites.updateMemberRole(platformCtx, id, body.data.role);
    return NextResponse.json(ok({ promoted: true }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    const status = err instanceof AccessDeniedError ? 403 : 400;
    return NextResponse.json(fail(message), { status });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireAdminSession();
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const { id } = await context.params;

  try {
    const platformOrgId = await requirePlatformOrganizationId();
    const platformCtx = withPlatformOrgContext(auth.session.ctx, platformOrgId);
    const { teamInvites, memberships } = createRepositories();
    const membership = await memberships.find(id, platformOrgId);
    if (!membership || (membership.role !== 'dispatcher' && membership.role !== 'driver')) {
      return NextResponse.json(fail('Membre introuvable'), { status: 404 });
    }
    await teamInvites.removeMember(platformCtx, id);
    return NextResponse.json(ok({ removed: true }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    const status = err instanceof AccessDeniedError ? 403 : 400;
    return NextResponse.json(fail(message), { status });
  }
}

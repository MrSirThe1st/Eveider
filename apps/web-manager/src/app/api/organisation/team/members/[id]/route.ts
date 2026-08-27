import { fail, ok, updateTeamMemberRoleSchema } from '@eveider/api-contracts';
import { AccessDeniedError, createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { requireBusinessSession } from '@/lib/session';

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await requireBusinessSession(undefined, 'manage_team');
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const { id } = await params;
  const body = updateTeamMemberRoleSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(fail(body.error.errors[0]?.message ?? 'Données invalides'), {
      status: 400,
    });
  }

  try {
    const { teamInvites } = createRepositories();
    const member = await teamInvites.updateMemberRole(auth.session.ctx, id, body.data.role);
    return NextResponse.json(
      ok({
        member: {
          id: member.id,
          fullName: member.fullName,
          email: member.email,
          userRole: member.userRole,
        },
      }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    const status = err instanceof AccessDeniedError ? 403 : 400;
    return NextResponse.json(fail(message), { status });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const auth = await requireBusinessSession(undefined, 'manage_team');
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const { id } = await params;
  try {
    const { teamInvites } = createRepositories();
    await teamInvites.removeMember(auth.session.ctx, id);
    return NextResponse.json(ok({ removed: true }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    const status = err instanceof AccessDeniedError ? 403 : 400;
    return NextResponse.json(fail(message), { status });
  }
}

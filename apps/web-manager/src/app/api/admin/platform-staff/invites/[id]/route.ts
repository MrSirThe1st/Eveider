import { fail, ok } from '@eveider/api-contracts';
import { AccessDeniedError, createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/session';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const auth = await requireAdminSession();
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const { id } = await context.params;

  try {
    const { platformStaff } = createRepositories();
    const result = await platformStaff.resendInvite(auth.session.ctx, id);
    return NextResponse.json(
      ok({
        invite: {
          id: result.invite.id,
          email: result.invite.email,
          invitedRole: result.invite.invitedRole,
          expiresAt: result.invite.expiresAt.toISOString(),
          inviteUrl: result.inviteUrl,
        },
      }),
    );
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
    const { platformStaff } = createRepositories();
    await platformStaff.revokeInvite(auth.session.ctx, id);
    return NextResponse.json(ok({ revoked: true }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    const status = err instanceof AccessDeniedError ? 403 : 400;
    return NextResponse.json(fail(message), { status });
  }
}

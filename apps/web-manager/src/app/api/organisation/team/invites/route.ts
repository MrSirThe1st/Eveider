import { fail, inviteTeamMemberSchema, ok } from '@eveider/api-contracts';
import { AccessDeniedError, createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { requireBusinessSession } from '@/lib/session';

export async function POST(request: Request) {
  const auth = await requireBusinessSession(undefined, 'manage_team');
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const body = inviteTeamMemberSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(fail(body.error.errors[0]?.message ?? 'Données invalides'), {
      status: 400,
    });
  }

  try {
    const { teamInvites } = createRepositories();
    const result = await teamInvites.invite(auth.session.ctx, body.data);
    return NextResponse.json(
      ok({
        invite: {
          id: result.invite.id,
          email: result.invite.email,
          invitedRole: result.invite.invitedRole,
          status: result.invite.status,
          expiresAt: result.invite.expiresAt.toISOString(),
          inviteUrl: result.inviteUrl,
        },
      }),
      { status: 201 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    const status = err instanceof AccessDeniedError ? 403 : 400;
    return NextResponse.json(fail(message), { status });
  }
}

import { fail, ok } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/session';

export async function GET() {
  const auth = await requireAdminSession();
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  try {
    const { platformStaff } = createRepositories();
    const members = await platformStaff.listStaff();
    const invites = await platformStaff.listPendingInvites(auth.session.ctx);
    return NextResponse.json(
      ok({
        members: members.map((member) => ({
          id: member.id,
          fullName: member.fullName,
          email: member.email,
          phone: member.phone,
          platformRole: member.platformRole,
          eveiderOrgRole: member.eveiderOrgRole,
        })),
        invites: invites.map((invite) => ({
          id: invite.id,
          email: invite.email,
          invitedRole: invite.invitedRole,
          expiresAt: invite.expiresAt.toISOString(),
        })),
      }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json(fail(message), { status: 500 });
  }
}

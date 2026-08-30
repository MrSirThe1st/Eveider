import { fail, ok } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { PLATFORM_ROLE_LABELS } from '@eveider/domain';
import { NextResponse } from 'next/server';

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { token } = await context.params;

  try {
    const { platformStaff } = createRepositories();
    const preview = await platformStaff.getPreview(token);
    if (!preview) {
      return NextResponse.json(fail('Invitation introuvable'), { status: 404 });
    }
    return NextResponse.json(
      ok({
        invite: {
          email: preview.email,
          invitedRole: preview.invitedRole,
          invitedRoleLabel: PLATFORM_ROLE_LABELS[preview.invitedRole],
          expiresAt: preview.expiresAt,
        },
      }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json(fail(message), { status: 400 });
  }
}

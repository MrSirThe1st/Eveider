import { fail, ok, updatePlatformStaffRoleSchema } from '@eveider/api-contracts';
import { AccessDeniedError, createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/session';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdminSession();
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const { id } = await context.params;
  const body = updatePlatformStaffRoleSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(fail(body.error.errors[0]?.message ?? 'Données invalides'), {
      status: 400,
    });
  }

  try {
    const { platformStaff } = createRepositories();
    const user = await platformStaff.updateRole(auth.session.ctx, id, body.data.role);
    return NextResponse.json(
      ok({
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          platformRole: user.platformRole,
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
    const user = await platformStaff.revokeAccess(auth.session.ctx, id);
    return NextResponse.json(
      ok({
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          platformRole: user.platformRole,
        },
      }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    const status = err instanceof AccessDeniedError ? 403 : 400;
    return NextResponse.json(fail(message), { status });
  }
}

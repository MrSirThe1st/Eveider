import { fail, ok } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/session';

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await requireAdminSession();
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const { id } = await params;

  try {
    const body = await request.json();

    if (
      typeof body !== 'object' ||
      body === null ||
      typeof body.isBlocked !== 'boolean'
    ) {
      return NextResponse.json(fail('Données invalides'), { status: 400 });
    }

    const { users } = createRepositories();
    const updated = await users.updateProfile(id, { isBlocked: body.isBlocked });

    return NextResponse.json(
      ok({
        user: {
          id: updated.id,
          fullName: updated.fullName,
          email: updated.email,
          phone: updated.phone,
          isBlocked: updated.isBlocked,
        },
      }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json(fail(message), { status: 500 });
  }
}

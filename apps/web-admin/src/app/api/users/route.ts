import { fail, ok } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import type { UserRole } from '@eveider/domain';
import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/session';

export async function GET(request: Request) {
  const auth = await requireAdminSession();
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const roleParam = searchParams.get('role') ?? 'customer';
  const search = searchParams.get('search') ?? '';

  if (roleParam !== 'customer' && roleParam !== 'courier') {
    return NextResponse.json(fail('Rôle invalide pour cet endpoint'), { status: 400 });
  }

  try {
    const { users } = createRepositories();
    const items = await users.listByRoleWithSearch(roleParam as UserRole, search || undefined);

    return NextResponse.json(
      ok({
        users: items.map((user) => ({
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          isBlocked: user.isBlocked,
          createdAt: user.createdAt.toISOString(),
        })),
      }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json(fail(message), { status: 500 });
  }
}

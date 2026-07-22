import { fail, ok } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import type { UserRole } from '@eveider/domain';
import { NextResponse } from 'next/server';
import { createRequestTimer } from '@/lib/perf/request-timer';
import { requireAdminSession } from '@/lib/session';

export async function GET(request: Request) {
  const perf = createRequestTimer('GET /api/users');
  const auth = await requireAdminSession(perf);
  if ('error' in auth) {
    perf.flush(auth.status);
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const roleParam = searchParams.get('role') ?? 'customer';
  const search = searchParams.get('search') ?? '';

  if (roleParam !== 'customer' && roleParam !== 'courier') {
    perf.flush(400);
    return NextResponse.json(fail('Rôle invalide pour cet endpoint'), { status: 400 });
  }

  try {
    const { users } = createRepositories();
    const items = await perf.measure('db.users.list', () =>
      users.listByRoleWithSearch(roleParam as UserRole, search || undefined),
    );

    perf.flush(200);
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
    perf.flush(500);
    return NextResponse.json(fail(message), { status: 500 });
  }
}

import { fail, ok } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { createRequestTimer } from '@/lib/perf/request-timer';
import { requireAdminSession } from '@/lib/session';

export async function GET() {
  const perf = createRequestTimer('GET /api/couriers');
  const auth = await requireAdminSession(perf);
  if ('error' in auth) {
    perf.flush(auth.status);
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  try {
    const { users } = createRepositories();
    const couriers = await perf.measure('db.couriers.list', () => users.listByRole('courier'));

    perf.flush(200);
    return NextResponse.json(
      ok({
        couriers: couriers.map((courier) => ({
          id: courier.id,
          fullName: courier.fullName,
          email: courier.email,
          phone: courier.phone,
        })),
      }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    perf.flush(500);
    return NextResponse.json(fail(message), { status: 500 });
  }
}

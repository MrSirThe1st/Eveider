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
    const { users } = createRepositories();
    const couriers = await users.listByRole('courier');

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
    return NextResponse.json(fail(message), { status: 500 });
  }
}

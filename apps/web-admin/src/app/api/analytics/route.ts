import { fail, ok } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/session';

export async function GET(request: Request) {
  const auth = await requireAdminSession();
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const daysParam = searchParams.get('days');
  const days = daysParam ? Number.parseInt(daysParam, 10) : 7;
  const safeDays = Number.isFinite(days) && days >= 1 && days <= 30 ? days : 7;

  try {
    const { stats } = createRepositories();
    const analytics = await stats.getAnalytics(auth.session.ctx, safeDays);

    return NextResponse.json(ok({ analytics }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json(fail(message), { status: 500 });
  }
}

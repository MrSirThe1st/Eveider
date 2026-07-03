import { fail, ok } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { toLockerSummaryDto } from '@/lib/locker-presenter';
import { requireAdminSession } from '@/lib/session';

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: RouteParams) {
  const auth = await requireAdminSession();
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const { id } = await params;

  try {
    const { lockers } = createRepositories();
    const locker = await lockers.archive(auth.session.ctx, id);

    return NextResponse.json(
      ok({
        locker: toLockerSummaryDto({
          ...locker,
          compartmentCounts: { available: 0, occupied: 0, reserved: 0, total: 0 },
        }),
      }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    const status = message.includes('archiver') ? 409 : 500;
    return NextResponse.json(fail(message), { status });
  }
}

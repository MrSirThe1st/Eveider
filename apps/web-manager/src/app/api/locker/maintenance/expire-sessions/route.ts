import { fail, ok } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { requireLockerMaintenance } from '@/lib/locker-api-session';

export async function POST(request: Request) {
  const auth = requireLockerMaintenance(request);
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const body = (await request.json().catch(() => ({}))) as { lockerId?: string };
  const { lockerActions } = createRepositories();
  const result = await lockerActions.expireLockerActionSessions(body.lockerId ?? null);
  return NextResponse.json(ok(result));
}

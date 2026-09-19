import { fail, ok } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { requireLockerMaintenance } from '@/lib/locker-api-session';

export async function GET(request: Request) {
  const auth = requireLockerMaintenance(request);
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const lockerId = new URL(request.url).searchParams.get('lockerId');
  const { lockerActions } = createRepositories();
  const findings = await lockerActions.inspectLockerIntegrity(lockerId || null);
  return NextResponse.json(ok({ findings }));
}

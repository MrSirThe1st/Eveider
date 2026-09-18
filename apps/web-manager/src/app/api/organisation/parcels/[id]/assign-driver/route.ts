import { fail } from '@eveider/api-contracts';
import { PRODUCT_LOCKS } from '@eveider/domain';
import { NextResponse } from 'next/server';
import { requireBusinessSession } from '@/lib/session';

export async function POST() {
  const auth = await requireBusinessSession(undefined, 'manage_couriers');
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  return NextResponse.json(fail(PRODUCT_LOCKS.orgDriverAssign), { status: 403 });
}

import { fail, lockerCollectionCredentialSyncQuerySchema, ok } from '@eveider/api-contracts';
import { createRepositories } from '@eveider/data-access';
import { NextResponse } from 'next/server';
import { requireLockerApi } from '@/lib/locker-api-session';

export async function GET(request: Request) {
  const auth = requireLockerApi(request);
  if ('error' in auth) {
    return NextResponse.json(fail(auth.error), { status: auth.status });
  }

  const url = new URL(request.url);
  const parsed = lockerCollectionCredentialSyncQuerySchema.safeParse({
    since: url.searchParams.get('since') ?? '0',
  });
  if (!parsed.success) {
    return NextResponse.json(fail(parsed.error.errors[0]?.message ?? 'Curseur invalide'), {
      status: 400,
    });
  }

  const { lockerActions, collectionCredentials } = createRepositories();
  await lockerActions.expireAuthorizedSessions({ lockerId: auth.lockerId });
  const page = await collectionCredentials.listChangesSince(auth.lockerId, parsed.data.since);
  return NextResponse.json(ok(page));
}
